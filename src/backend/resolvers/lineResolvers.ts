import type { LineModel } from "../db/collections.js";

/**
 * Field resolvers for Line type
 * Customizes line name display based on transport type
 */
export const Line = {
  /**
   * Resolve id field - maps MongoDB _id to GraphQL id
   */
  id(parent: LineModel) {
    return parent._id?.toString() || "";
  },

  /**
   * Resolve name field
   * For BUS: return name as-is
   * For RAIL: return "name (gtfsId)" if gtfsId exists
   */
  name(parent: LineModel) {
    // For buses, return name as-is
    if (parent.transportType === "BUS") {
      return parent.name;
    }

    // For rail (trains/trams), append gtfsId if it exists
    if (parent.transportType === "RAIL" && parent.gtfsId) {
      return `${parent.name} (${parent.gtfsId})`;
    }

    // Fallback: just return name
    return parent.name;
  },

  /**
   * Resolve transportType field - pass through
   */
  transportType(parent: LineModel) {
    return parent.transportType;
  },
};

export default Line;
