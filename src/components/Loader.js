import React from "react";
import {
  Backdrop,
  CircularProgress,
  Typography,
  Box,
  useTheme,
} from "@mui/material";
import { useLoader } from "../contexts/LoaderContext";

const Loader = () => {
  const { loading, message } = useLoader();
  const theme = useTheme();

  return (
    <Backdrop
      sx={{
        zIndex: (theme) => Math.max(theme.zIndex.drawer - 1, 1999),
        backgroundColor:theme.palette.mode === "dark"? "rgba(0, 0, 0, 0.7)": "rgba(255, 255, 255, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        color: theme.palette.primary.main,
      }}
      open={loading}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: 4,
        }}
      >
        <CircularProgress color="primary" size={60} thickness={4} />
        {message && (
          <Typography
            variant="h6"
            component="div"
            sx={{
              mt: 2,
              fontWeight: 600,
              color: theme.palette.text.primary,
              textAlign: "center",
            }}
          >
            {message}
          </Typography>
        )}
      </Box>
    </Backdrop>
  );
};

export default Loader;
