let circomlibJSOverride: any;

// eslint-disable-next-line global-require
export const getCircomlibJS = () => circomlibJSOverride ?? require('circomlibjs');

export const setCircomlibJS = (override: any) => {
  circomlibJSOverride = override;
};
