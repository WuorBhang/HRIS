# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListAllEntries*](#listallentries)
  - [*GetEntryById*](#getentrybyid)
- [**Mutations**](#mutations)
  - [*CreateNewEntry*](#createnewentry)
  - [*AddTagToEntry*](#addtagtoentry)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListAllEntries
You can execute the `ListAllEntries` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listAllEntries(options?: ExecuteQueryOptions): QueryPromise<ListAllEntriesData, undefined>;

interface ListAllEntriesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllEntriesData, undefined>;
}
export const listAllEntriesRef: ListAllEntriesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllEntries(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllEntriesData, undefined>;

interface ListAllEntriesRef {
  ...
  (dc: DataConnect): QueryRef<ListAllEntriesData, undefined>;
}
export const listAllEntriesRef: ListAllEntriesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllEntriesRef:
```typescript
const name = listAllEntriesRef.operationName;
console.log(name);
```

### Variables
The `ListAllEntries` query has no variables.
### Return Type
Recall that executing the `ListAllEntries` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllEntriesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAllEntriesData {
  entries: ({
    id: UUIDString;
    content: string;
    createdAt: TimestampString;
    entryDate: DateString;
    user: {
      id: UUIDString;
      displayName: string;
    } & User_Key;
      tags_via_EntryTag: ({
        id: UUIDString;
        name: string;
      } & Tag_Key)[];
  } & Entry_Key)[];
}
```
### Using `ListAllEntries`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllEntries } from '@dataconnect/generated';


// Call the `listAllEntries()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllEntries();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllEntries(dataConnect);

console.log(data.entries);

// Or, you can use the `Promise` API.
listAllEntries().then((response) => {
  const data = response.data;
  console.log(data.entries);
});
```

### Using `ListAllEntries`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllEntriesRef } from '@dataconnect/generated';


// Call the `listAllEntriesRef()` function to get a reference to the query.
const ref = listAllEntriesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllEntriesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.entries);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.entries);
});
```

## GetEntryById
You can execute the `GetEntryById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getEntryById(vars: GetEntryByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetEntryByIdData, GetEntryByIdVariables>;

interface GetEntryByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetEntryByIdVariables): QueryRef<GetEntryByIdData, GetEntryByIdVariables>;
}
export const getEntryByIdRef: GetEntryByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getEntryById(dc: DataConnect, vars: GetEntryByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetEntryByIdData, GetEntryByIdVariables>;

interface GetEntryByIdRef {
  ...
  (dc: DataConnect, vars: GetEntryByIdVariables): QueryRef<GetEntryByIdData, GetEntryByIdVariables>;
}
export const getEntryByIdRef: GetEntryByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getEntryByIdRef:
```typescript
const name = getEntryByIdRef.operationName;
console.log(name);
```

### Variables
The `GetEntryById` query requires an argument of type `GetEntryByIdVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetEntryByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetEntryById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetEntryByIdData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetEntryByIdData {
  entry?: {
    id: UUIDString;
    content: string;
    createdAt: TimestampString;
    entryDate: DateString;
    user: {
      id: UUIDString;
      displayName: string;
      email?: string | null;
    } & User_Key;
      entryTags_on_entry: ({
        tag: {
          id: UUIDString;
          name: string;
        } & Tag_Key;
      })[];
  } & Entry_Key;
}
```
### Using `GetEntryById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getEntryById, GetEntryByIdVariables } from '@dataconnect/generated';

// The `GetEntryById` query requires an argument of type `GetEntryByIdVariables`:
const getEntryByIdVars: GetEntryByIdVariables = {
  id: ..., 
};

// Call the `getEntryById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getEntryById(getEntryByIdVars);
// Variables can be defined inline as well.
const { data } = await getEntryById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getEntryById(dataConnect, getEntryByIdVars);

console.log(data.entry);

// Or, you can use the `Promise` API.
getEntryById(getEntryByIdVars).then((response) => {
  const data = response.data;
  console.log(data.entry);
});
```

### Using `GetEntryById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getEntryByIdRef, GetEntryByIdVariables } from '@dataconnect/generated';

// The `GetEntryById` query requires an argument of type `GetEntryByIdVariables`:
const getEntryByIdVars: GetEntryByIdVariables = {
  id: ..., 
};

// Call the `getEntryByIdRef()` function to get a reference to the query.
const ref = getEntryByIdRef(getEntryByIdVars);
// Variables can be defined inline as well.
const ref = getEntryByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getEntryByIdRef(dataConnect, getEntryByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.entry);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.entry);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateNewEntry
You can execute the `CreateNewEntry` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createNewEntry(vars: CreateNewEntryVariables): MutationPromise<CreateNewEntryData, CreateNewEntryVariables>;

interface CreateNewEntryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewEntryVariables): MutationRef<CreateNewEntryData, CreateNewEntryVariables>;
}
export const createNewEntryRef: CreateNewEntryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createNewEntry(dc: DataConnect, vars: CreateNewEntryVariables): MutationPromise<CreateNewEntryData, CreateNewEntryVariables>;

interface CreateNewEntryRef {
  ...
  (dc: DataConnect, vars: CreateNewEntryVariables): MutationRef<CreateNewEntryData, CreateNewEntryVariables>;
}
export const createNewEntryRef: CreateNewEntryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createNewEntryRef:
```typescript
const name = createNewEntryRef.operationName;
console.log(name);
```

### Variables
The `CreateNewEntry` mutation requires an argument of type `CreateNewEntryVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateNewEntryVariables {
  content: string;
  entryDate: DateString;
}
```
### Return Type
Recall that executing the `CreateNewEntry` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateNewEntryData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateNewEntryData {
  entry_insert: Entry_Key;
}
```
### Using `CreateNewEntry`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createNewEntry, CreateNewEntryVariables } from '@dataconnect/generated';

// The `CreateNewEntry` mutation requires an argument of type `CreateNewEntryVariables`:
const createNewEntryVars: CreateNewEntryVariables = {
  content: ..., 
  entryDate: ..., 
};

// Call the `createNewEntry()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createNewEntry(createNewEntryVars);
// Variables can be defined inline as well.
const { data } = await createNewEntry({ content: ..., entryDate: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createNewEntry(dataConnect, createNewEntryVars);

console.log(data.entry_insert);

// Or, you can use the `Promise` API.
createNewEntry(createNewEntryVars).then((response) => {
  const data = response.data;
  console.log(data.entry_insert);
});
```

### Using `CreateNewEntry`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createNewEntryRef, CreateNewEntryVariables } from '@dataconnect/generated';

// The `CreateNewEntry` mutation requires an argument of type `CreateNewEntryVariables`:
const createNewEntryVars: CreateNewEntryVariables = {
  content: ..., 
  entryDate: ..., 
};

// Call the `createNewEntryRef()` function to get a reference to the mutation.
const ref = createNewEntryRef(createNewEntryVars);
// Variables can be defined inline as well.
const ref = createNewEntryRef({ content: ..., entryDate: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createNewEntryRef(dataConnect, createNewEntryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.entry_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.entry_insert);
});
```

## AddTagToEntry
You can execute the `AddTagToEntry` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
addTagToEntry(vars: AddTagToEntryVariables): MutationPromise<AddTagToEntryData, AddTagToEntryVariables>;

interface AddTagToEntryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddTagToEntryVariables): MutationRef<AddTagToEntryData, AddTagToEntryVariables>;
}
export const addTagToEntryRef: AddTagToEntryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addTagToEntry(dc: DataConnect, vars: AddTagToEntryVariables): MutationPromise<AddTagToEntryData, AddTagToEntryVariables>;

interface AddTagToEntryRef {
  ...
  (dc: DataConnect, vars: AddTagToEntryVariables): MutationRef<AddTagToEntryData, AddTagToEntryVariables>;
}
export const addTagToEntryRef: AddTagToEntryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addTagToEntryRef:
```typescript
const name = addTagToEntryRef.operationName;
console.log(name);
```

### Variables
The `AddTagToEntry` mutation requires an argument of type `AddTagToEntryVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddTagToEntryVariables {
  entryId: UUIDString;
  tagId: UUIDString;
}
```
### Return Type
Recall that executing the `AddTagToEntry` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddTagToEntryData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddTagToEntryData {
  entryTag_insert: EntryTag_Key;
}
```
### Using `AddTagToEntry`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addTagToEntry, AddTagToEntryVariables } from '@dataconnect/generated';

// The `AddTagToEntry` mutation requires an argument of type `AddTagToEntryVariables`:
const addTagToEntryVars: AddTagToEntryVariables = {
  entryId: ..., 
  tagId: ..., 
};

// Call the `addTagToEntry()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addTagToEntry(addTagToEntryVars);
// Variables can be defined inline as well.
const { data } = await addTagToEntry({ entryId: ..., tagId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addTagToEntry(dataConnect, addTagToEntryVars);

console.log(data.entryTag_insert);

// Or, you can use the `Promise` API.
addTagToEntry(addTagToEntryVars).then((response) => {
  const data = response.data;
  console.log(data.entryTag_insert);
});
```

### Using `AddTagToEntry`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addTagToEntryRef, AddTagToEntryVariables } from '@dataconnect/generated';

// The `AddTagToEntry` mutation requires an argument of type `AddTagToEntryVariables`:
const addTagToEntryVars: AddTagToEntryVariables = {
  entryId: ..., 
  tagId: ..., 
};

// Call the `addTagToEntryRef()` function to get a reference to the mutation.
const ref = addTagToEntryRef(addTagToEntryVars);
// Variables can be defined inline as well.
const ref = addTagToEntryRef({ entryId: ..., tagId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addTagToEntryRef(dataConnect, addTagToEntryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.entryTag_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.entryTag_insert);
});
```

