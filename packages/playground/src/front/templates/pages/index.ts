export async function data() {
  return {
    head: {
      title: '',
      description: '',
    },
    version: process.env.npm_package_version,
  };
}
