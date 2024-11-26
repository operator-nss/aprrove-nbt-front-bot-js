import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const JIRA_URL = process.env.JIRA_URL;

const jiraInstance = axios.create({
  baseURL: JIRA_URL,
  headers: {
    Authorization: `Bearer Nzg4MDE3OTg2ODc0OqBg4PXpPWAA2LSjNn0nEuw4B91t`,
    Accept: 'application/json',
  },
});

export default jiraInstance;
