/**
 * Converts a string to a slug.
 * @param str - The string to convert.
 * @returns The slug version of the string.
 */
export const toSlug = (str: string): string => {
	return str
		.toLowerCase() // Convert to lowercase
		.replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric characters with hyphens
		.replace(/(^-+)|(-+$)/g, ""); // Remove leading and trailing hyphens
};

/**
 * Generates a simple UUID v4
 * @returns A UUID v4 string
 */
export const uuidv4 = (): string => {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};