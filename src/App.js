import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo';
import SensorDashboard from './components/SensorDashboard';
import './App.css';

function App() {
  return (
    <ApolloProvider client={client}>
      <div className="App">
        <SensorDashboard />
      </div>
    </ApolloProvider>
  );
}

export default App;
