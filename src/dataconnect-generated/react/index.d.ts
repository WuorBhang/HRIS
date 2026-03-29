import { ListAllEntriesData, GetEntryByIdData, GetEntryByIdVariables, CreateNewEntryData, CreateNewEntryVariables, AddTagToEntryData, AddTagToEntryVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListAllEntries(options?: useDataConnectQueryOptions<ListAllEntriesData>): UseDataConnectQueryResult<ListAllEntriesData, undefined>;
export function useListAllEntries(dc: DataConnect, options?: useDataConnectQueryOptions<ListAllEntriesData>): UseDataConnectQueryResult<ListAllEntriesData, undefined>;

export function useGetEntryById(vars: GetEntryByIdVariables, options?: useDataConnectQueryOptions<GetEntryByIdData>): UseDataConnectQueryResult<GetEntryByIdData, GetEntryByIdVariables>;
export function useGetEntryById(dc: DataConnect, vars: GetEntryByIdVariables, options?: useDataConnectQueryOptions<GetEntryByIdData>): UseDataConnectQueryResult<GetEntryByIdData, GetEntryByIdVariables>;

export function useCreateNewEntry(options?: useDataConnectMutationOptions<CreateNewEntryData, FirebaseError, CreateNewEntryVariables>): UseDataConnectMutationResult<CreateNewEntryData, CreateNewEntryVariables>;
export function useCreateNewEntry(dc: DataConnect, options?: useDataConnectMutationOptions<CreateNewEntryData, FirebaseError, CreateNewEntryVariables>): UseDataConnectMutationResult<CreateNewEntryData, CreateNewEntryVariables>;

export function useAddTagToEntry(options?: useDataConnectMutationOptions<AddTagToEntryData, FirebaseError, AddTagToEntryVariables>): UseDataConnectMutationResult<AddTagToEntryData, AddTagToEntryVariables>;
export function useAddTagToEntry(dc: DataConnect, options?: useDataConnectMutationOptions<AddTagToEntryData, FirebaseError, AddTagToEntryVariables>): UseDataConnectMutationResult<AddTagToEntryData, AddTagToEntryVariables>;
