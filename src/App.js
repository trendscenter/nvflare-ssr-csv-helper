// App.js
import React, { useState, useEffect } from "react";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { TextareaAutosize } from '@mui/base/TextareaAutosize';
import copy from 'copy-text-to-clipboard';
import Papa from "papaparse";
import {
  Autocomplete,
  TextField,
  Checkbox,
  Chip,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  Button,
  Stack
} from "@mui/material";
import "./App.css";

const allowedExtensions = ["csv"];

const steps = [
  "Select & Parse covariates.csv",
  "Select & Parse data.csv",
  "Pick columns & Review JSON"
];

const App = () => {
  const [error, setError] = useState("");
  const [covFile, setCovFile] = useState("");
  const [dataFile, setDataFile] = useState("");
  const [paramObj, setParamObj] = useState({ Covariates: {}, Dependents: {}, Lambda: 0, IgnoreSubjectsWithInvalidData: false });
  const [isCopied, setIsCopied] = useState(false);

  const [covColumns, setCovColumns] = useState([]);
  const [dataColumns, setDataColumns] = useState([]);

  const [selectedCov, setSelectedCov] = useState([]);
  const [selectedDep, setSelectedDep] = useState([]);

  // Stepper state (manual control)
  const [activeStep, setActiveStep] = useState(0);

  // ---------- File handling ----------
  const handleFileChange = (e, filename) => {
    setError("");
    if (e.target.files.length) {
      const inputFile = e.target.files[0];
      const fileExtension = inputFile?.type.split("/")[1];
      if (!allowedExtensions.includes(fileExtension)) {
        setError("Please input a csv file");
        return;
      }
      if (inputFile.name !== filename){
        setError("Please select your " + filename + " file");
        return;         
      } else { 
        if (filename === 'covariates.csv') setCovFile(inputFile);
        if (filename === 'data.csv') setDataFile(inputFile);
      }
    }
  };

  // ---------- Type helpers ----------
  const isNumeric = (num) =>
    ((typeof num === 'number') || (typeof num === "string" && num.trim() !== '')) && !isNaN(num);

  const isBooleanLiteral = (str) => {
    if (str === null || str === undefined) return false;
    const s = String(str).trim();
    return ['true', 'false', 'True', 'False', '0', '1'].includes(s);
  };

  const classifyValue = (value) => {
    if (value === null) return 'NoneType';
    if (Array.isArray(value)) return 'list';
    const t = typeof value;
    if (t === 'object') return 'dict';
    if (isBooleanLiteral(value)) return 'bool';
    if (isNumeric(value)) {
      const n = Number(value);
      return Number.isInteger(n) ? 'int' : 'float';
    }
    if (t === 'string') return 'str';
    if (t === 'undefined') return 'undefined';
    return 'unknown';
  };

  // Majority-vote type inference for a column (never "Mixed")
  const inferColumnType = (values) => {
    const counts = new Map();
    for (const v of values) {
      if (v === '' || v === null || v === undefined) continue;
      const type = classifyValue(v);
      counts.set(type, (counts.get(type) || 0) + 1);
    }
    if (counts.size === 0) return 'NoneType';
    let best = null, bestCount = -1;
    counts.forEach((cnt, type) => {
      if (cnt > bestCount) { best = type; bestCount = cnt; }
    });
    return best || 'str';
  };

  // Parse → build { name, type } catalog for columns
  const parseFileToCatalog = (file, onDone) => {
    if (!file) return alert("Enter a valid file");
    const reader = new FileReader();
    reader.onload = async ({ target }) => {
      const csv = Papa.parse(target.result, {
        header: true,
        skipEmptyLines: true,
      });
      const rows = csv?.data || [];
      if (!rows.length) {
        onDone([]);
        return;
      }
      const columnNames = Object.keys(rows[0]);
      const sample = rows.slice(0, 1000);
      const catalog = columnNames.map((name) => {
        const colVals = sample.map(r => r[name]);
        const type = inferColumnType(colVals);
        return { name, type };
      });
      onDone(catalog);
    };
    reader.readAsText(file);
  };

  const handleParseCov = (file) =>
    parseFileToCatalog(file, (catalog) => {
      setCovColumns(catalog);
      setSelectedCov([]); // reset on re-parse
    });

  const handleParseData = (file) =>
    parseFileToCatalog(file, (catalog) => {
      setDataColumns(catalog);
      setSelectedDep([]); // reset on re-parse
    });

  // Keep paramObj in sync with selections
  useEffect(() => {
    setIsCopied(false);
    const cov = selectedCov.reduce((acc, opt) => {
      acc[opt.name] = opt.type;
      return acc;
    }, {});
    const dep = selectedDep.reduce((acc, opt) => {
      acc[opt.name] = opt.type;
      return acc;
    }, {});
    setParamObj(prev => ({ ...prev, Covariates: cov, Dependents: dep }));
  }, [selectedCov, selectedDep]);

  const handleCopy = () => {
    copy(JSON.stringify(paramObj, null, 2));
    setIsCopied(true);
  };

  const getOptionLabel = (opt) => opt?.name || "";

  // ---------- Stepper logic / guards ----------
  const covParsed = covColumns.length > 0;
  const dataParsed = dataColumns.length > 0;

  const canNextFromStep = (step) => {
    if (step === 0) return covParsed;  // must parse covariates first
    if (step === 1) return dataParsed; // must parse data next
    if (step === 2) return false;      // last step; use Finish
    return false;
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1 && canNextFromStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) setActiveStep((prev) => prev - 1);
  };

  const handleFinish = () => {
    handleCopy();
  };

  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h2>Settings Generator</h2>
          <small>For Single-Round Ridge Regression for FreeSurfer Data</small>
        </div>

        {/* Step indicator */}
        <Paper elevation={0} sx={{ p: 2, mb: 2 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* STEP 0: covariates.csv */}
        {activeStep === 0 && (
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Step 1 — Select & Parse covariates.csv</Typography>
            <Box sx={{ position: 'relative', mt: 1 }}>
              <label htmlFor="csvInputCov" style={{ display: "block" }}>
                Select <b>covariates.csv</b> File
              </label>
              <input
                onChange={(e) => { handleFileChange(e, 'covariates.csv') }}
                id="csvInputCov"
                name="file"
                type="File"
              />
              {covFile && (
                <Box sx={{ fontSize: '2rem', position: 'absolute', top: '-1rem', right: '-0.5rem' }}>
                  <CheckCircleIcon style={{color: '#2FB600', background:'white', borderRadius: '50%'}} />
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 2 }}>
              <button
                onClick={() => handleParseCov(covFile)}
                disabled={!covFile}
                style={{
                  background: covFile ? '#2FB600' : '#8bbf8b',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '1rem',
                  color: 'white',
                  cursor: covFile ? 'pointer' : 'not-allowed'
                }}
              >
                Parse Covariates File
              </button>
            </Box>

            {covParsed && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>Pick Covariate Columns</Typography>
                <Autocomplete
                  multiple
                  options={covColumns}
                  value={selectedCov}
                  onChange={(e, val) => setSelectedCov(val)}
                  getOptionLabel={getOptionLabel}
                  filterSelectedOptions
                  disableCloseOnSelect
                  renderOption={(props, option, { selected }) => (
                    <li {...props} key={`cov-${option.name}`}>
                      <Checkbox checked={selected} style={{ marginRight: 8 }} />
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <span>{option.name}</span>
                        <Chip size="small" label={option.type} />
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search columns…"
                      size="small"
                      fullWidth
                      sx={{ width: '100%', maxWidth: '100%' }}
                    />
                  )}
                  sx={{ width: '100%', maxWidth: '100%' }}
                />
              </>
            )}

            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} justifyContent="flex-end">
              <Button variant="outlined" disabled onClick={handleBack}>Back</Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!canNextFromStep(0)}
              >
                Next
              </Button>
            </Stack>
          </Paper>
        )}

        {/* STEP 1: data.csv */}
        {activeStep === 1 && (
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Step 2 — Select & Parse data.csv</Typography>
            <Box sx={{ position: 'relative', mt: 1 }}>
              <label htmlFor="csvInputData" style={{ display: "block" }}>
                Select <b>data.csv</b> File
              </label>
              <input
                onChange={(e) => { handleFileChange(e, 'data.csv') }}
                id="csvInputData"
                name="file"
                type="File"
              />
              {dataFile && (
                <Box sx={{ fontSize: '2rem', position: 'absolute', top: '-1rem', right: '-0.5rem' }}>
                  <CheckCircleIcon style={{color: '#2FB600', background:'white', borderRadius: '50%'}} />
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 2 }}>
              <button
                onClick={() => handleParseData(dataFile)}
                disabled={!dataFile}
                style={{
                  background: dataFile ? '#2FB600' : '#8bbf8b',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '1rem',
                  color: 'white',
                  cursor: dataFile ? 'pointer' : 'not-allowed'
                }}
              >
                Parse Data File
              </button>
            </Box>

            {dataParsed && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>Pick Dependent Columns</Typography>
                <Autocomplete
                  multiple
                  options={dataColumns}
                  value={selectedDep}
                  onChange={(e, val) => setSelectedDep(val)}
                  getOptionLabel={getOptionLabel}
                  filterSelectedOptions
                  disableCloseOnSelect
                  renderOption={(props, option, { selected }) => (
                    <li {...props} key={`dep-${option.name}`}>
                      <Checkbox checked={selected} style={{ marginRight: 8 }} />
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <span>{option.name}</span>
                        <Chip size="small" label={option.type} />
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search columns…"
                      size="small"
                      fullWidth
                      sx={{ width: '100%', maxWidth: '100%' }}
                    />
                  )}
                  sx={{ width: '100%', maxWidth: '100%' }}
                />
              </>
            )}

            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} justifyContent="space-between">
              <Button variant="outlined" onClick={handleBack}>Back</Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!canNextFromStep(1)}
              >
                Next
              </Button>
            </Stack>
          </Paper>
        )}

        {/* STEP 2: Review / Copy */}
        {activeStep === 2 && (
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Step 3 — Pick columns & Review / Copy Settings JSON</Typography>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Covariate Columns</Typography>
            {covParsed ? (
              <Autocomplete
                multiple
                options={covColumns}
                value={selectedCov}
                onChange={(e, val) => setSelectedCov(val)}
                getOptionLabel={getOptionLabel}
                filterSelectedOptions
                disableCloseOnSelect
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={`cov2-${option.name}`}>
                    <Checkbox checked={selected} style={{ marginRight: 8 }} />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <span>{option.name}</span>
                      <Chip size="small" label={option.type} />
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search columns…"
                    size="small"
                    fullWidth
                    sx={{ width: '100%', maxWidth: '100%' }}
                  />
                )}
                sx={{ width: '100%', maxWidth: '100%', mb: 2 }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                (No covariates parsed; go back to Step 1.)
              </Typography>
            )}

            <Typography variant="subtitle2" gutterBottom>Dependent Columns</Typography>
            {dataParsed ? (
              <Autocomplete
                multiple
                options={dataColumns}
                value={selectedDep}
                onChange={(e, val) => setSelectedDep(val)}
                getOptionLabel={getOptionLabel}
                filterSelectedOptions
                disableCloseOnSelect
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={`dep2-${option.name}`}>
                    <Checkbox checked={selected} style={{ marginRight: 8 }} />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <span>{option.name}</span>
                      <Chip size="small" label={option.type} />
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search columns…"
                    size="small"
                    fullWidth
                    sx={{ width: '100%', maxWidth: '100%' }}
                  />
                )}
                sx={{ width: '100%', maxWidth: '100%', mb: 2 }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                (No dependents parsed; go back to Step 2.)
              </Typography>
            )}

            <Box sx={{ position: 'relative', width: 'calc(100% - 2rem)', mt: 1 }}>
              {isCopied ? (
                <span style={{ position: 'absolute', top: '1.5rem', right: '-1rem', color: '#aaa' }}>
                  Copied
                </span>
              ) : (
                <button
                  onClick={handleCopy}
                  style={{
                    position: 'absolute',
                    top: '1.5rem',
                    right: 'calc(-50% - 0.5rem)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  title="Copy JSON"
                >
                  <ContentCopyIcon style={{color: 'white', background: '#1A2948'}} />
                </button>
              )}

              <TextareaAutosize
                minRows={6}
                maxRows={22}
                style={{
                  background: '#1A2948',
                  fontSize: '1rem',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '1rem',
                  width: '100%',
                  overflowY: 'auto',
                  resize: 'none'
                }}
                value={JSON.stringify(paramObj, null, 2)}
                readOnly
              />
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} justifyContent="space-between">
              <Button variant="outlined" onClick={handleBack}>Back</Button>
              <Button
                variant="contained"
                color={isCopied ? "success" : "primary"}
                onClick={handleFinish}
                disabled={!covParsed || !dataParsed}
              >
                {isCopied ? "Copied!" : "Finish"}
              </Button>
            </Stack>
          </Paper>
        )}

        {error && <div style={{ color: '#b00020' }}>{error}</div>}
      </div>
    </div>
  );
};

export default App;
