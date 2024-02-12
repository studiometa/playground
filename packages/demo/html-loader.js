/**
 * Wrap the editor's HTML in a div with some padding.
 * @param   {string} value
 * @returns {Promise<string>}
 */
export default async function wrapHtmlLoader(value) {
  return `<div class="p-10">${value}</div>`;
}
