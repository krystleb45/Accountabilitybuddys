import { Socket } from "socket.io";
import redisClient from "../config/redisClient"; // Redis client for rate limiter
import logger from "../utils/winstonLogger"; // Logger for rate limiting events

/**
 * @desc    Creates a rate limiter middleware for WebSocket events.
 *          Uses Redis as the backend to support distributed rate-limiting across servers.
 * 
 * @param   maxRequests - The maximum number of allowed requests during the window.
 * @param   windowMs - The time window in milliseconds for the rate limit.
 * @param   eventName - The WebSocket event to be rate-limited.
 * @returns Middleware function for socket rate limiting.
 */
const createSocketRateLimiter = (
  maxRequests: number,
  windowMs: number,
  eventName: string
) => {
  return async (socket: Socket, next: (err?: Error) => void): Promise<void> => {
    const userId = socket.user?.id as string; // Ensure `socket.user.id` is available and is a string
    const rateLimiterKey = `ws_rate_limit:${eventName}:${userId}`;

    try {
      // Increment the event counter for the user
      const requests = await redisClient.incr(rateLimiterKey);

      // Set expiration for the rate limiter key if it's a new counter
      if (requests === 1) {
        await redisClient.expire(rateLimiterKey, windowMs / 1000); // Convert ms to seconds
      }

      // Check if the user has exceeded the max request limit
      if (requests > maxRequests) {
        logger.warn(`Rate limit exceeded for user ${userId} on event ${eventName}`);
        return next(new Error(`Rate limit exceeded for ${eventName}. Please wait before trying again.`));
      }

      next(); // Proceed to the next middleware or event handler
    } catch (error) {
      logger.error(
        `Rate limiter error for user ${userId} on event ${eventName}: ${(error as Error).message}`
      );
      next(new Error("Rate limiter error. Please try again later."));
    }
  };
};

export default createSocketRateLimiter;
