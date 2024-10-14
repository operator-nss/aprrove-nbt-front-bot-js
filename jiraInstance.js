import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const JIRA_URL = process.env.JIRA_URL;

const jiraInstance = axios.create({
  baseURL: JIRA_URL,
  headers: {
    Authorization: `Bearer OTk2NDA4NDYxMzU3OrJ/Re1eE2FJtMeOWO2PFeg/s4e/`,
    Accept: 'application/json',
  },
});

export default jiraInstance;
