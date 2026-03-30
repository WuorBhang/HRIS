import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AddTagToEntryData {
  entryTag_insert: EntryTag_Key;
}

export interface AddTagToEntryVariables {
  entryId: UUIDString;
  tagId: UUIDString;
}

export interface CreateNewEntryData {
  entry_insert: Entry_Key;
}

export interface CreateNewEntryVariables {
  content: string;
  entryDate: DateString;
}

export interface EntryTag_Key {
  entryId: UUIDString;
  tagId: UUIDString;
  __typename?: 'EntryTag_Key';
}

export interface Entry_Key {
  id: UUIDString;
  __typename?: 'Entry_Key';
}

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

export interface GetEntryByIdVariables {
  id: UUIDString;
}

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

export interface Tag_Key {
  id: UUIDString;
  __typename?: 'Tag_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface ListAllEntriesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllEntriesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllEntriesData, undefined>;
  operationName: string;
}
export const listAllEntriesRef: ListAllEntriesRef;

export function listAllEntries(options?: ExecuteQueryOptions): QueryPromise<ListAllEntriesData, undefined>;
export function listAllEntries(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllEntriesData, undefined>;

interface GetEntryByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetEntryByIdVariables): QueryRef<GetEntryByIdData, GetEntryByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetEntryByIdVariables): QueryRef<GetEntryByIdData, GetEntryByIdVariables>;
  operationName: string;
}
export const getEntryByIdRef: GetEntryByIdRef;

export function getEntryById(vars: GetEntryByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetEntryByIdData, GetEntryByIdVariables>;
export function getEntryById(dc: DataConnect, vars: GetEntryByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetEntryByIdData, GetEntryByIdVariables>;

interface CreateNewEntryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewEntryVariables): MutationRef<CreateNewEntryData, CreateNewEntryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateNewEntryVariables): MutationRef<CreateNewEntryData, CreateNewEntryVariables>;
  operationName: string;
}
export const createNewEntryRef: CreateNewEntryRef;

export function createNewEntry(vars: CreateNewEntryVariables): MutationPromise<CreateNewEntryData, CreateNewEntryVariables>;
export function createNewEntry(dc: DataConnect, vars: CreateNewEntryVariables): MutationPromise<CreateNewEntryData, CreateNewEntryVariables>;

interface AddTagToEntryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddTagToEntryVariables): MutationRef<AddTagToEntryData, AddTagToEntryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddTagToEntryVariables): MutationRef<AddTagToEntryData, AddTagToEntryVariables>;
  operationName: string;
}
export const addTagToEntryRef: AddTagToEntryRef;

export function addTagToEntry(vars: AddTagToEntryVariables): MutationPromise<AddTagToEntryData, AddTagToEntryVariables>;
export function addTagToEntry(dc: DataConnect, vars: AddTagToEntryVariables): MutationPromise<AddTagToEntryData, AddTagToEntryVariables>;

