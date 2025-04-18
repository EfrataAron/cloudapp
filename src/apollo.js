// src/apollo.js
import {
    ApolloClient,
    InMemoryCache,
    split,
    HttpLink,
    ApolloLink
  } from '@apollo/client';
  import { createAuthLink } from 'aws-appsync-auth-link';
  import { createSubscriptionHandshakeLink } from 'aws-appsync-subscription-link';
  import config from './aws-exports';
  
  const url = config.API.GraphQL.endpoint;
  const region = config.API.GraphQL.region;
  const auth = {
    type: 'API_KEY',
    apiKey: config.API.GraphQL.apiKey,
  };
  
  const httpLink = createAuthLink({ url, region, auth }).concat(
    new HttpLink({ uri: url })
  );
  
  const subscriptionLink = createSubscriptionHandshakeLink(
    { url, region, auth },
    httpLink
  );
  
  const link = split(
    (operation) => {
      const definition = operation.query.definitions[0];
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    subscriptionLink,
    httpLink
  );
  
  // Error handling link
  const errorLink = new ApolloLink((operation, forward) => {
    return forward(operation).map(response => {
      if (response.errors) {
        console.error('GraphQL Errors:', response.errors);
      }
      return response;
    });
  });
  
  // Create and export Apollo Client
  export const client = new ApolloClient({
    link: ApolloLink.from([errorLink, link]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            listSensorsData: {
              merge: false // Don't merge with cached data
            }
          }
        }
      }
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'network-only', // Don't use cache
        nextFetchPolicy: 'network-only',
        pollInterval: 1000, // Poll every second
      },
      query: {
        fetchPolicy: 'network-only', // Don't use cache
      },
      subscription: {
        fetchPolicy: 'network-only' // Don't use cache
      }
    },
  });
  