import React from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";
import LogoImg from "../assets/images/logo.png";

const Logo = ({ height = 50 }) => {
  return (
    <Box
      component="img"
      src={LogoImg}
      alt="Logo"
      sx={{
        height: `${height}px`,
        width: "auto",
      }}
    />
  );
};

// Definición de tipos de propiedades
Logo.propTypes = {
  height: PropTypes.number,
};

export default Logo;
