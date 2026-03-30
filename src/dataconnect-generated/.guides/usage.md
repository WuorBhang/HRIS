# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useListAllEntries, useGetEntryById, useCreateNewEntry, useAddTagToEntry } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useListAllEntries();

const { data, isPending, isSuccess, isError, error } = useGetEntryById(getEntryByIdVars);

const { data, isPending, isSuccess, isError, error } = useCreateNewEntry(createNewEntryVars);

const { data, isPending, isSuccess, isError, error } = useAddTagToEntry(addTagToEntryVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listAllEntries, getEntryById, createNewEntry, addTagToEntry } from '@dataconnect/generated';


// Operation ListAllEntries: 
const { data } = await ListAllEntries(dataConnect);

// Operation GetEntryById:  For variables, look at type GetEntryByIdVars in ../index.d.ts
const { data } = await GetEntryById(dataConnect, getEntryByIdVars);

// Operation CreateNewEntry:  For variables, look at type CreateNewEntryVars in ../index.d.ts
const { data } = await CreateNewEntry(dataConnect, createNewEntryVars);

// Operation AddTagToEntry:  For variables, look at type AddTagToEntryVars in ../index.d.ts
const { data } = await AddTagToEntry(dataConnect, addTagToEntryVars);


```