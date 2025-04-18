import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { Amplify } from 'aws-amplify';
import config from './aws-exports';
import { client } from './apollo';
import SensorChart from './components/sensorchart';
import './App.css';

// Configure Amplify with the correct config
Amplify.configure(config);

function App() {
  return (
    <ApolloProvider client={client}>
      <div className="App">
        <header className="App-header">
          <h1>Sensor Dashboard</h1>
        </header>
        <main>
          <SensorChart />
        </main>
      </div>
    </ApolloProvider>
  );
}

export default App;
