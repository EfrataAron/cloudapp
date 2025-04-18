// src/apollo.js
import {
    ApolloClient,
    InMemoryCache,
    split,
    HttpLink
  } from '@apollo/client';
  import { WebSocketLink } from '@apollo/client/link/ws';
  import { getMainDefinition } from '@apollo/client/utilities';
  
  const httpLink = new HttpLink({
    uri: 'https://your-appsync-api-id.appsync-api.eu-north-1.amazonaws.com/graphql',
    headers: {
      'x-api-key': 'YOUR_APPSYNC_API_KEY'
    }
  });
  
  const wsLink = new WebSocketLink({
    uri: 'wss://your-appsync-api-id.appsync-realtime-api.eu-north-1.amazonaws.com/graphql',
    options: {
      reconnect: true,
      connectionParams: {
        authToken: 'YOUR_APPSYNC_API_KEY'
      }
    }
  });
  
  const splitLink = split(
    ({ query }) => {
      const def = getMainDefinition(query);
      return (
        def.kind === 'OperationDefinition' &&
        def.operation === 'subscription'
      );
    },
    wsLink,
    httpLink
  );
  
  export const client = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache()
  });
  