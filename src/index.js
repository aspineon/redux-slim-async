
import { isFSA } from 'flux-standard-action';
import errorMessages from './errors';

function validateInput(
  {
    typePrefix,
    types,
    callAPI,
    formatData = res => res,
    shouldCallAPI = () => true,
    payload = {},
    meta = {},
  },
  options,
) {
  if (
    options === undefined
    && (
      !Array.isArray(types)
      || types.length !== 3
      || !types.every(t => typeof t === 'string')
    )
  ) {
    throw new Error(errorMessages.types);
  }
  if (
    options !== undefined
    && typeof typePrefix !== 'string'
  ) {
    throw new Error(errorMessages.type);
  }
  if (typeof callAPI !== 'function') {
    throw new Error(errorMessages.callAPI);
  }
  if (typeof formatData !== 'function') {
    throw new Error(errorMessages.formatData);
  }
  if (typeof shouldCallAPI !== 'function') {
    throw new Error(errorMessages.shouldCallAPI);
  }
  if (typeof payload !== 'object') {
    throw new Error(errorMessages.payload);
  }
  if (typeof meta !== 'object') {
    throw new Error(errorMessages.meta);
  }
}

function validateOptions({ pendingSuffix, successSuffix, errorSuffix }) {
  if (
    typeof pendingSuffix !== 'string'
    || typeof successSuffix !== 'string'
    || typeof errorSuffix !== 'string'
  ) throw new Error(errorMessages.options)
}

function optionsAreValid(typePrefix, types, options) {
  if (options === undefined && !types) return false;
  if (options === undefined && types) return true;
  if (options !== undefined && !typePrefix) return false;
  if (options !== undefined && typePrefix) {
    validateOptions(options);
    return true;
  }
  return false;
}

function getActionTypes(typePrefix, types, options) {
  if (options !== undefined) {
    return [
      `${typePrefix}${options.pendingSuffix}`,
      `${typePrefix}${options.successSuffix}`,
      `${typePrefix}${options.errorSuffix}`,
    ];
  }
  return types;
}

function createSlimAsyncMiddleware(options) {
  return ({ dispatch, getState }) => next => (action) => {
    const {
      typePrefix,
      types,
      callAPI,
      formatData = res => res,
      shouldCallAPI = () => true,
      payload = {},
      meta = {},
    } = action;

    if (typePrefix && !callAPI) return next(action);
    if (!optionsAreValid(typePrefix, types, options)) return next(action);

    validateInput(action, options);

    if (!shouldCallAPI(getState())) return null;

    const [pendingType, successType, errorType] = getActionTypes(typePrefix, types, options);

    const pendingAction = { payload, type: pendingType };

    if (!isFSA(pendingAction)) next(action);
    else dispatch(pendingAction);

    return callAPI()
      .then((response) => {
        const formattedData = formatData(response);
        if (typeof formattedData !== 'object') {
          throw new Error(errorMessages.formatDataReturn);
        }

        const successAction = {
          type: successType,
          payload: {
            ...payload,
            ...formattedData,
          },
          meta,
        };

        if (!isFSA(successAction)) next(action);
        else dispatch(successAction);

        return Promise.resolve(getState());
      })
      .catch(error => {
        const errorAction = {
          payload: error,
          error: true,
          type: errorType,
          meta,
        };

        if (!isFSA(errorAction)) next(action);
        else dispatch(errorAction);

        return Promise.reject(error);
      });
  };
}

const slimAsync = createSlimAsyncMiddleware();
slimAsync.withOptions = createSlimAsyncMiddleware;

export default slimAsync;
