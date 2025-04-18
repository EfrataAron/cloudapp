import React from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import SensorChart from './components/sensorchart';

const client = new ApolloClient({
  uri: 'https://your-appsync-endpoint/graphql', // Replace with your AppSync endpoint
  cache: new InMemoryCache(),
});

function App() {
  return (
    <ApolloProvider client={client}>
      <div className="App">
        <SensorChart />
      </div>
    </ApolloProvider>
  );
}

export default App;
