import chai from 'chai';
import erorrMessages from '../src/errors';
import slimAsync from '../src/index';

describe('reudx-slim-async middleware', () => {
  const doDispatch = () => {};
  const doGetState = () => {};
  const validActionParams = {
    types: ['REQUEST_PENDING', 'REQUEST_SUCCEDED', 'REQUEST_FAILED'],
    callAPI: () => Promise.resolve({}),
  };
  const validActionParamsWithOptions = {
    typePrefix: 'REQUEST_DATA',
    callAPI: () => Promise.resolve({}),
  };
  const validOptions = {
    pendingSuffix: '_PENDING',
    successSuffix: '_SUCCESS',
    errorSuffix: '_ERROR',
    isFSACompliant: true,
  };
  const nextHandler = slimAsync({
    dispatch: doDispatch,
    getState: doGetState,
  });
  const nextHandlerWithOptions = options =>
    slimAsync.withOptions(options)({
      dispatch: doDispatch,
      getState: doGetState,
    });

  it('must return a function to handle next', () => {
    chai.assert.isFunction(nextHandler);
    chai.assert.strictEqual(nextHandler.length, 1);
  });

  describe('handle return value', () => {
    it('must return a Promise', () => {
      chai.assert.isFunction(nextHandler()(validActionParams).then);
      chai.assert.isFunction(nextHandler()(validActionParams).catch);
    });

    it('must return a Promise when shouldCallAPI is false', () => {
      chai.assert.isFunction(
        nextHandler()({ ...validActionParams, shouldCallAPI: () => false })
          .then,
      );
      chai.assert.isFunction(
        nextHandler()({ ...validActionParams, shouldCallAPI: () => false })
          .catch,
      );
    });
  });

  describe('handle next', () => {
    it('must pass action to next if types is not an array', done => {
      const actionObj = {};
      const actionHandler = nextHandler(action => {
        chai.assert.strictEqual(action, actionObj);
        done();
      });

      actionHandler(actionObj);
    });
  });

  describe('handle errors', () => {
    it('must throw if action argument callAPI is not a function', () => {
      try {
        nextHandler()({
          ...validActionParams,
          callAPI: null,
        });
      } catch (err) {
        chai.assert.strictEqual(err.message, erorrMessages.callAPI);
      }
    });

    it('must throw if types is not an array of strings', () => {
      try {
        nextHandler()({
          ...validActionParams,
          types: ['REQUEST_PENDING', 'REQUEST_SUCCEDED', null],
        });
      } catch (err) {
        chai.assert.strictEqual(err.message, erorrMessages.types);
      }
    });

    it('must throw if types is not an array of fewer than 3 strings', () => {
      try {
        nextHandler()({
          ...validActionParams,
          types: ['REQUEST_PENDING', 'REQUEST_SUCCEDED'],
        });
      } catch (err) {
        chai.assert.strictEqual(err.message, erorrMessages.types);
      }
    });

    it('must throw if formatData is not a function', () => {
      try {
        nextHandler()({
          ...validActionParams,
          formatData: null,
        });
      } catch (err) {
        chai.assert.strictEqual(err.message, erorrMessages.formatData);
      }
    });

    it('must throw if formatData does not return an object', () => {
      try {
        nextHandler()({
          ...validActionParams,
          formatData: () => null,
        });
      } catch (err) {
        chai.assert.strictEqual(err.message, erorrMessages.formatDataReturn);
      }
    });

    it('must throw if payload is not an object', () => {
      try {
        nextHandler()({
          ...validActionParams,
          payload: null,
        });
      } catch (err) {
        chai.assert.strictEqual(err.message, erorrMessages.payload);
      }
    });

    it('must throw if meta is not an object', () => {
      try {
        nextHandler()({
          ...validActionParams,
          meta: null,
        });
      } catch (err) {
        chai.assert.strictEqual(err.message, erorrMessages.meta);
      }
    });
  });

  describe('with extra options', () => {
    it('must resolve given valid options', done => {
      slimAsync
        .withOptions(validOptions)({
          dispatch: doDispatch,
          getState: doGetState,
        })()(validActionParamsWithOptions)
        .then(() => done());
    });

    it('must throw given invalid options', () => {
      try {
        slimAsync.withOptions({})({
          dispatch: doDispatch,
          getState: doGetState,
        })()(validActionParamsWithOptions);
      } catch (err) {
        chai.assert.strictEqual(err.message, erorrMessages.options);
      }
    });

    it('must throw if typePrefix is defined but not a string', () => {
      try {
        slimAsync.withOptions(validOptions)({
          dispatch: doDispatch,
          getState: doGetState,
        })()({
          ...validActionParamsWithOptions,
          typePrefix: {},
        });
      } catch (err) {
        chai.assert.strictEqual(err.message, erorrMessages.type);
      }
    });

    it('must call next if typePrefix is not defined', done => {
      slimAsync.withOptions(validOptions)({
        dispatch: doDispatch,
        getState: doGetState,
      })(() => done())({
        ...validActionParamsWithOptions,
        typePrefix: null,
      });
    });

    it('must call next if callAPI is not defined', done => {
      slimAsync.withOptions(validOptions)({
        dispatch: doDispatch,
        getState: doGetState,
      })(() => done())({
        ...validActionParamsWithOptions,
        callAPI: null,
      });
    });

    it('must return a non FSA compliant action if option is set', () => {
      slimAsync.withOptions({ ...validOptions, isFSACompliant: false })({
        dispatch: data => {
          if (data.type === 'REQUEST_DATA_SUCCESS') {
            chai.assert.strictEqual(data.entry, 'some data');
          }
        },
        getState: doGetState,
      })()({
        ...validActionParamsWithOptions,
        callAPI: () => Promise.resolve({ entry: 'some data' }),
      });
    });
  });
});
