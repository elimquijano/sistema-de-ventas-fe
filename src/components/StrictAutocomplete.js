import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  ClickAwayListener,
} from "@mui/material";

export const StrictAutocomplete = ({
  options = [],
  filterKey,
  matchMode = "any",
  getOptionLabel,
  getOptionSublabel,
  value = "",
  onInputChange,
  onChange,
  TextFieldProps = {},
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounceRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return options.filter((option) => {
      const text = (
        typeof option === "string" ? option : option[filterKey] || ""
      ).toLowerCase();
      return matchMode === "start" ? text.startsWith(q) : text.includes(q);
    });
  }, [query, options, filterKey, matchMode]);

  const handleInputChange = useCallback(
    (newValue) => {
      onInputChange?.(newValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setQuery(newValue);
        setOpen(!!newValue);
      }, 120);
    },
    [onInputChange],
  );

  const handleSelect = useCallback(
    (option) => {
      const label =
        typeof option === "string"
          ? option
          : getOptionLabel
            ? getOptionLabel(option)
            : option[filterKey] || "";
      onInputChange?.(label);
      setQuery(label);
      onChange?.(option);
      setOpen(false);
    },
    [getOptionLabel, filterKey, onInputChange, onChange],
  );

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative" }}>
        <TextField
          {...TextFieldProps}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (filtered.length > 0) setOpen(true);
          }}
          autoComplete="off"
        />
        {open && filtered.length > 0 && (
          <Paper
            elevation={4}
            sx={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 1400,
              maxHeight: 220,
              overflowY: "auto",
              mt: 0.5,
              borderRadius: 1,
            }}
          >
            <List dense disablePadding>
              {filtered.slice(0, 30).map((option, idx) => (
                <ListItem
                  key={idx}
                  button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(option);
                  }}
                  sx={{
                    py: 0.8,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:last-child": { borderBottom: "none" },
                    "&:hover": { bgcolor: "action.hover", cursor: "pointer" },
                  }}
                >
                  <ListItemText
                    primary={
                      getOptionLabel
                        ? getOptionLabel(option)
                        : typeof option === "string"
                          ? option
                          : option[filterKey]
                    }
                    secondary={
                      getOptionSublabel ? getOptionSublabel(option) : undefined
                    }
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                    secondaryTypographyProps={{ fontSize: 11 }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};
