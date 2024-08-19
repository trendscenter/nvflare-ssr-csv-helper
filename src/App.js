// Filename - App.js

import React, { useState, useEffect } from "react";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { TextareaAutosize } from '@mui/base/TextareaAutosize';
import copy from 'copy-text-to-clipboard';
import Papa from "papaparse";
import "./App.css";

// Allowed extensions for input file
const allowedExtensions = ["csv"];

const App = () => {

    const [error, setError] = useState("");
    const [covFile, setCovFile] = useState("");
    const [dataFile, setDataFile] = useState("");
    const [paramObj, setParamObj] = useState({ "Covariates": {}, "Dependents": {}, "Lambda": 0});
    const [isCopied, setIsCopied] = useState(false);


    const handleFileChange = (e, filename) => {
        setError("");

        // Check if user has entered the file
        if (e.target.files.length) {
            const inputFile = e.target.files[0];

            // Check the file extensions, if it not
            // included in the allowed extensions
            // we show the error
            const fileExtension =
                inputFile?.type.split("/")[1];
            if (
                !allowedExtensions.includes(fileExtension)
            ) {
                setError("Please input a csv file");
                return;
            }

            console.log(inputFile,filename);

           if (inputFile.name !== filename){
            setError("Please select your "+filename+" file");
            return;         
           }else{ 
            if(filename === 'covariates.csv'){
              setCovFile(inputFile);
            }
            if(filename === 'data.csv'){
              setDataFile(inputFile);
            }
           }
        }
    };

    const handleParseCov = (file) => {
        // If user clicks the parse button without
        // a file we show a error
        if (!file) return alert("Enter a valid file");

        // Initialize a reader which allows user
        // to read any file or blob.
        const reader = new FileReader();

        // Event listener on reader when the file
        // loads, we parse it and set the data.
        reader.onload = async ({ target, key }) => {
            const csv = Papa.parse(target.result, {
                header: true,
            });
            const parsedData = csv?.data;
            const rows = Object.keys(parsedData[0]);

            const columns = Object.values(parsedData[0]);
            const res = rows.reduce((acc, e, i) => {
                return {...acc, [e]: typeVars(columns[i])};
            }, []);
            console.log({'Covariates':res});
            setParamObj({...paramObj, Covariates: res});
        };
        reader.readAsText(file);
    };

    const handleParseData = (file) => {
      // If user clicks the parse button without
      // a file we show a error
      if (!file) return alert("Enter a valid file");

      // Initialize a reader which allows user
      // to read any file or blob.
      const reader = new FileReader();

      // Event listener on reader when the file
      // loads, we parse it and set the data.
      reader.onload = async ({ target, key }) => {
          const csv = Papa.parse(target.result, {
              header: true,
          });
          const parsedData = csv?.data;
          const rows = Object.keys(parsedData[0]);

          const columns = Object.values(parsedData[0]);
          const res = rows.reduce((acc, e, i) => {
              return {...acc, [e]: typeVars(columns[i])};
          }, []);
          console.log({'Dependents':res});
          setParamObj({...paramObj, Dependents:res});
      };
      reader.readAsText(file);
    };

    useEffect(() => {
      setIsCopied(false);
    }, [paramObj]);

    const isNumeric = (num) => (typeof(num) === 'number' || typeof(num) === "string" && num.trim() !== '') && !isNaN(num);

    const isBoolean = (str) => {
      const boolVals = ['true', 'false', 'True', 'False', '0', '1'];
      return boolVals.includes(str);
    }

    const typeVars = (str) => {
       if(isBoolean(str)){
          return 'bool';
       }else if(isNumeric(str)){
          return 'int';
       }else{
          return 'str';
       }
    } 

    const handleCopy = () => {
      copy(JSON.stringify(paramObj, null, 2));
      setIsCopied(!isCopied);
    }

    return (
        <div className="App">
            <div className="container">
                <h1 className="header">Settings Generator</h1>
                <small>For NVflare SSR CSV</small>
                <div style={{position: 'relative'}}>
                  <label
                      htmlFor="csvInputCov"
                      style={{ display: "block" }}
                  >
                      Select <b>covariates.csv</b> File
                  </label>
                  <input
                      onChange={(e) => { handleFileChange(e, 'covariates.csv') }}
                      id="csvInputCov"
                      name="file"
                      type="File"
                  />
                  {covFile && <div style={{
                    fontSize: '2rem',
                    position: 'absolute', 
                    top: '-1rem', 
                    right: '-0.5rem'
                  }}>
                    <CheckCircleIcon style={{color: '#2FB600', background:'white', borderRadius: '50%'}} />
                  </div>}
                </div>
                {covFile && <div style={{marginTop: '1rem'}}>
                    <button 
                      onClick={() => handleParseCov(covFile)}
                      style={{
                        background: '#2FB600', 
                        border: 'none', 
                        padding: '0.5rem 1rem', 
                        borderRadius: '1rem', 
                        color: 'white'
                      }}
                    >
                    Parse Covariates File
                    </button>
                </div>}
                <div style={{position: 'relative', marginTop: '1rem'}}>
                  <label
                      htmlFor="csvInputData"
                      style={{ display: "block" }}
                  >
                      Select <b>data.csv</b> File
                  </label>
                  <input
                      onChange={(e) => { handleFileChange(e, 'data.csv') }}
                      id="csvInputData"
                      name="file"
                      type="File"
                  />
                  {dataFile && <div style={{
                    fontSize: '2rem',
                    position: 'absolute', 
                    top: '-1rem', 
                    right: '-0.5rem'
                  }}>
                    <CheckCircleIcon style={{color: '#2FB600', background:'white', borderRadius: '50%'}} />
                  </div>}
                </div>
                {dataFile && <div style={{marginTop: '1rem'}}>
                    <button 
                      onClick={() => handleParseData(dataFile)}
                      style={{
                        background: '#2FB600',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '1rem', 
                        color: 'white'
                      }}
                    >
                    Parse Data File
                    </button>
                </div>}
                {error && <div>{error}</div>}
                {<div style={{
                  position: 'relative', 
                  width: 'calc(100% - 2rem)'
                  }}>
                  {isCopied ? <span 
                    style={{
                      position: 'absolute', 
                      top: '2rem', 
                      right: '-1rem', 
                      background: 'none', 
                      border: 'none',
                      color: '#aaa'
                    }}>
                      Copied</span>:<button 
                    onClick={() => handleCopy()}
                    style={{
                      position: 'absolute', 
                      top: '2rem', 
                      right: 'calc(-50% - 0.5rem)', 
                      background: 'none', 
                      border: 'none'
                    }}
                  ><ContentCopyIcon style={{color: 'white', background: '#444'}} /></button>}
                  <TextareaAutosize
                    style={{ 
                      background: '#333',
                      fontSize: '1rem', 
                      marginTop: '1rem', 
                      color: 'white',
                      padding: '1rem',
                      borderRadius: '1rem',
                      width: '100%' 
                    }} 
                    value={JSON.stringify(paramObj, null, 2)} 
                  />
                </div>}
            </div>
        </div>
    );
};

export default App;