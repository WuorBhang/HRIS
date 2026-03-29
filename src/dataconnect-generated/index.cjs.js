const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'hris',
  location: 'us-west2'
};
exports.connectorConfig = connectorConfig;

const listAllEntriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllEntries');
}
listAllEntriesRef.operationName = 'ListAllEntries';
exports.listAllEntriesRef = listAllEntriesRef;

exports.listAllEntries = function listAllEntries(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllEntriesRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const getEntryByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetEntryById', inputVars);
}
getEntryByIdRef.operationName = 'GetEntryById';
exports.getEntryByIdRef = getEntryByIdRef;

exports.getEntryById = function getEntryById(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getEntryByIdRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const createNewEntryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewEntry', inputVars);
}
createNewEntryRef.operationName = 'CreateNewEntry';
exports.createNewEntryRef = createNewEntryRef;

exports.createNewEntry = function createNewEntry(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createNewEntryRef(dcInstance, inputVars));
}
;

const addTagToEntryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddTagToEntry', inputVars);
}
addTagToEntryRef.operationName = 'AddTagToEntry';
exports.addTagToEntryRef = addTagToEntryRef;

exports.addTagToEntry = function addTagToEntry(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(addTagToEntryRef(dcInstance, inputVars));
}
;
