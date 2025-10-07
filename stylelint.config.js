export default {
  extends: '@studiometa/stylelint-config',
  rules: {
    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'config',
          'theme',
          'custom-variant',
        ],
      },
    ],
  },
};
