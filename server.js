import 'dotenv/config'
import fs from "fs";
import bodyParser from 'body-parser';
import express from 'express';
import nunjucks from 'nunjucks';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import { fromPath } from "pdf2pic";
import multer from 'multer';
import { performance } from 'perf_hooks';


// === SET UP EXPRESS === //

var app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// create constants for filename and dirname
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

app.use('/assets', express.static(path.join(__dirname, '/node_modules/govuk-frontend/dist/govuk/assets')))

nunjucks.configure([
  'app/views',
  'node_modules/govuk-frontend/dist/'
],
  {
    autoescape: true,
    express: app,
    noCache: true
  })

app.set('view engine', 'html')
app.use(express.json());
app.use(express.static('public'));


// === THE USER INTERFACE === //

/* FUNCTION: Sum the items between two indexes in a numerical array */
function arraySum(array, start, end){
    var sum = 0;
    for(let i = start; i < end; i++){
         sum += array[i];
    } 
    return sum;
}

/* FUNCTION: Load file data  */

function loadFileData(formId){
  try {
    return JSON.parse(fs.readFileSync('./public/results/form-'+formId+'/form.json'))
  } catch (err) {
    return err
  }
}

const port = 3001;

/* Render home page */
app.get('/', (req, res) => {

  // Get list of form directories
  const formDirs = fs.readdirSync('./public/results').filter((item) => item.startsWith("form-"));

  // Create JSON summary of all the forms
  const formData = JSON.parse('{"forms":[]}');
  for(const formDir of formDirs){
    const formId = formDir.slice(5); // Remove 'form-'
    const fileData = loadFileData(formId);
    formData.forms.push({
      "formId": formId,
      "filename": fileData.filename,
      "model": fileData.model,
      "size": fileData.formStructure.length
    });
  };

  // Pass JSON summary to home page
  res.locals.formData = formData;
  res.render('index.njk')
})

/* Render results pages */
app.get('/results/form-:formId/:pageNum/:question?', (req, res) => {
  const formId = req.params.formId 
  const pageNum = Number(req.params.pageNum) 
  const question = req.params.question ? Number(req.params.question) : 1
  const fileData = loadFileData(formId)
  res.locals.formId = formId
  res.locals.pageNum = pageNum
  res.locals.question = question
  res.locals.fileData = fileData
  res.render('result.njk')
})

/* Render pop-up check-answers pages */
app.get('/form-popup/:formId/:question/check-answers', (req, res) => {
  const formId = req.params.formId
  const question = req.params.question
  const fileData = loadFileData(formId)
  res.locals.formId = formId
  res.locals.fileData = fileData
  res.locals.question = question
  res.render('check-answers-popup.njk')
})

/* Render check-answers pages */
app.get('/forms/:formId/:pageNum/:question/check-answers', (req, res) => {
  const formId = req.params.formId
  const pageNum = req.params.pageNum
  const question = req.params.question
  const fileData = loadFileData(formId)
  res.locals.formId = formId
  res.locals.fileData = fileData
  res.locals.pageNum = pageNum
  res.locals.question = question
  res.render('check-answers.njk')
})

/* Render form pages */
app.get('/forms/:formId/:pageNum/:question', (req, res) => {
  const formId = req.params.formId
  const fileData = loadFileData(formId)
  const pageNum = Number(req.params.pageNum)
  const question = Number(req.params.question)
  res.locals.formId = formId
  res.locals.fileData = fileData
  res.locals.pageNum = pageNum
  res.locals.question = question
  res.locals.questionIndex = arraySum(fileData.formStructure, 0, pageNum-1) + question -1
  res.render('form.njk');
})

/* Render popup form pages */
app.get('/form-popup/:formId/:questionIndex', (req, res) => {
  const formId = req.params.formId
  const fileData = loadFileData(formId)
  const pageNum = Number(req.params.pageNum)
  const questionIndex = Number(req.params.questionIndex)
  res.locals.formId = formId
  res.locals.fileData = fileData
  res.locals.pageNum = Number(req.params.pageNum)
  res.locals.question = questionIndex
  res.render('form-popup.njk');
})


/* Render list pages */
app.get('/lists/:formId/:pageNum', (req, res) => {
  const formId = req.params.formId 
  const fileData = loadFileData(formId)
  res.locals.fileData = fileData
  res.render('list.njk')
})

/* Render JSON pages */
app.get('/json/:formId/:pageNum', (req, res) => {  
  const formId = req.params.formId 
  const fileData = loadFileData(formId)
  res.locals.formId = formId
  res.locals.fileData = fileData
  res.render('json.njk')
})

app.listen(port, () => {
  console.log('Server running at http://localhost:3001');
})