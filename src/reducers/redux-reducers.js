/* eslint no-unused-vars: "off" */
const initialState = {
    count: 0,
};
let reducers = (state = initialState, action = {} = initialState) => {
    switch (action.type) {
        case 'INCREMENT_COUNT':
            return Object.assign({}, state, {
                count: state.count + 1,
            });
        default:
            return state;
    }
};
