import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { Amplify } from 'aws-amplify';
import config from './aws-exports'; // Make sure aws-exports.js is in the same folder

Amplify.configure(config); // Initialize Amplify

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
