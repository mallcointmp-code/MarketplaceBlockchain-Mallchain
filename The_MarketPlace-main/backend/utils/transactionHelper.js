const mongoose = require('mongoose');

/**
 * Runs a set of operations within a MongoDB transaction if possible.
 * If the environment (standalone MongoDB) doesn't support transactions,
 * it runs the operations as a normal batch without a session.
 * 
 * @param {Function} callback - Async function receiving (session)
 */
async function runInTransaction(callback) {
    let session = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const result = await callback(session);

        await session.commitTransaction();
        return result;
    } catch (error) {
        if (session) {
            if (session.transaction.isActive) {
                await session.abortTransaction();
            }
        }

        // Handle standalone MongoDB error
        if (error.codeName === 'CommandNotSupportedOnStandaloneEntity' ||
            error.message.includes('replica set member')) {
            // Fallback: Run without a session
            console.warn("MongoDB Standalone detected. Running without transaction safety.");
            return await callback(null);
        }

        throw error;
    } finally {
        if (session) {
            session.endSession();
        }
    }
}

module.exports = { runInTransaction };
