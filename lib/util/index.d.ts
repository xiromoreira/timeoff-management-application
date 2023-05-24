const util: {
    sorter(a: any, b: any): number,
    promisifyCallbackFn<Return, Params>(
        fn: (...p: Params, cb: (err: any, res: Return) => void) => void,
        ...params: Params
    ): Promise,
};

export default util;