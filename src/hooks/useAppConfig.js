import { useContext } from "react";
import AppConfigContext from "../context/AppConfigContext";

/**
 * Hook to access the runtime app config.
 * Returns { config, configLoading, configError }
 */
const useAppConfig = () => useContext(AppConfigContext);

export default useAppConfig;
