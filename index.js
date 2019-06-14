const { createLogger, format, transports } = require('winston');
const { combine } = format;

const LEVEL_TO_STACKDRIVER_NAME = {
    emerg: 'EMERGENCY', 
    alert: 'ALERT', 
    crit: 'CRITICAL', 
    error: 'ERROR', 
    warn: 'WARNING', 
    notice: 'NOTICE', 
    info: 'INFO', 
    debug: 'DEBUG'
};

module.exports = {
    /**
     * Creates a new Winston logger that logs to stdout using JSON and maps log
     * levels to Stackdriver severity levels.
     * @return {winston.Logger} Winston logger instance
     */
    createLogger: function() {
        const log = createLogger({
            transports: [
                new transports.Console(),
            ],
            format: combine(
                format(info => {
                    info.severity = LEVEL_TO_STACKDRIVER_NAME[info.level];
                    delete info.level;
                    return info;
                })(),
                format.json()
            )
        });
        return log;
    },

    /**
     * Creates an Express middleware that creates a child logger for each
     * request that includes the current trace.
     * @param {winston.Logger} Winston logger instance
     * @param {StackdriverTracer} Stackdriver tracer agent
     * @return {function(req, res, next)} Express middleware function
     */
    createExpressMiddleware: function(log, traceAgent) {
        return function(req, res, next) {
            req.log = log.child({
                'logging.googleapis.com/trace': getCurrentTrace(traceAgent)
            });
            next();
        };
    }
};

function getCurrentTrace(agent) {
    if (!agent || !agent.getCurrentContextId || !agent.getWriterProjectId) {
        return null;
    }

    const traceId = agent.getCurrentContextId();
    if (!traceId) {
        return null;
    }

    const traceProjectId = agent.getWriterProjectId();
    if (!traceProjectId) {
        return null;
    }

    return `projects/${traceProjectId}/traces/${traceId}`;
}
