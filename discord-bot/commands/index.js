/**
 * Defines the structure of a command.
 *
 * @typedef {object} Command
 * @property {import('discord.js').RESTPostAPIApplicationCommandsJSONBody} data The data for the command
 * @property {(interaction: import('discord.js').CommandInteraction) => Promise<void> | void} execute The function to execute when the command is called
 */

/**
 * Defines the predicate to check if an object is a valid Command type.
 *
 * @type {import('../util/loaders.js').StructurePredicate<Command>}
 * @returns {structure is Command}
 */
export const predicate = (structure) =>
	Boolean(structure) &&
	typeof structure === 'object' &&
	'data' in structure &&
	'execute' in structure &&
	typeof structure.data === 'object' &&
	typeof structure.execute === 'function';