import { Client, Databases } from 'appwrite';

const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APP_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(import.meta.env.VITE_APP_APPWRITE_PROJECT || '69e34dd9002fef599d7d');

export const databases = new Databases(client);
export const DB_ID = import.meta.env.VITE_APP_APPWRITE_DB_ID || '';
export const COL_ID = import.meta.env.VITE_APP_APPWRITE_COL_ID || '';
