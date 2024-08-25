import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const GITLAB_TOKEN = process.env.GITLAB_ACCESS_TOKEN;

// Создаем агент с отключенной проверкой сертификатов
const agent = new https.Agent({
  rejectUnauthorized: false,
});

const axiosInstance = axios.create({
  httpsAgent: agent,
  headers: {
    'PRIVATE-TOKEN': GITLAB_TOKEN,
  },
});

export default axiosInstance;
