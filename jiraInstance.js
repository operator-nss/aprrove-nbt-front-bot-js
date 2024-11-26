import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const JIRA_URL = process.env.JIRA_URL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;

const jiraInstance = axios.create({
  baseURL: JIRA_URL,
  headers: {
    Authorization: `Bearer ${JIRA_TOKEN}`,
    Accept: 'application/json',
  },
});

export default jiraInstance;
