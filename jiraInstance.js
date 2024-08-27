import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const JIRA_URL = process.env.JIRA_URL;

const jiraInstance = axios.create({
  baseURL: JIRA_URL,
  headers: {
    Authorization: `Basic YWxla3NleS5zb2tvbG92QG5vcmJpdC5ydTpOemt4TkRNME1qQTVNVEUxT3VZWFNVMWE4a3ZIRm94ZEE4dVZGZVNINllEeQ==`,
    Accept: 'application/json',
  },
});

export default jiraInstance;
