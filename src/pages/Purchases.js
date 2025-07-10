import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Autocomplete,
  CircularProgress,
  Paper,
  Chip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  AddShoppingCart,
  Delete,
  UploadFile,
  Receipt,
  Save,
} from '@mui/icons-material';
import { productsAPI, businessAPI } from '../utils/api'; // Asumo que businessAPI tiene el endpoint de compras
import { useAuth } from '../contexts/AuthContext';
import { notificationSwal } from '../utils/swal-helpers';
import { formatCurrency } from '../utils/formatters';

// Componente para el modal de creación rápida de productos
const CreateProductModal = ({ open, onClose, onProductCreated, businessId }) => {
  const [newProduct, setNewProduct] = useState({ name: '', cost: '', price: '', stock: 0, min_stock: 5, status: 'active' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await productsAPI.create({ ...newProduct, business_id: businessId });
      onProductCreated(res.data);
      notificationSwal('Éxito', 'Producto creado correctamente', 'success');
      onClose();
    } catch (error) {
      console.error("Error creating product:", error);
      notificationSwal('Error', 'No se pudo crear el producto', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Crear Nuevo Producto</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Nombre del Producto"
          fullWidth
          variant="outlined"
          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
        />
        <TextField
          margin="dense"
          label="Costo"
          type="number"
          fullWidth
          variant="outlined"
          onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
        />
        <TextField
          margin="dense"
          label="Precio de Venta"
          type="number"
          fullWidth
          variant="outlined"
          onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving}>
          {isSaving ? <CircularProgress size={24} /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const Purchases = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [generateReceipt, setGenerateReceipt] = useState(false);
  const [total, setTotal] = useState(0);

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [cost, setCost] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const newTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    setTotal(newTotal);
  }, [items]);

  const handleSearch = useCallback(async (term) => {
    if (term.length < 2) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const response = await businessAPI.searchProducts(term); // Asumo que existe este método
      setOptions(response.data);
    } catch (error) {
      console.error("Error searching products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0 || cost < 0) {
      notificationSwal('Atención', 'Selecciona un producto y define una cantidad y costo válidos.', 'warning');
      return;
    }

    const newItem = {
      ...selectedProduct,
      quantity: parseInt(quantity, 10),
      cost: parseFloat(cost),
      subtotal: parseInt(quantity, 10) * parseFloat(cost),
    };

    setItems([...items, newItem]);
    setSelectedProduct(null);
    setQuantity(1);
    setCost('');
    setOptions([]);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleProductCreated = (product) => {
    setSelectedProduct(product);
    setCost(product.cost);
  };

  const handleSavePurchase = async () => {
    if (items.length === 0) {
        notificationSwal('Error', 'Debes añadir al menos un producto a la compra.', 'error');
        return;
    }

    setIsSaving(true);
    const formData = new FormData();
    formData.append('supplier_name', supplier);
    formData.append('purchase_date', purchaseDate);
    formData.append('notes', notes);
    formData.append('generate_receipt', generateReceipt ? '1' : '0');
    if (receiptFile) {
        formData.append('receipt_file', receiptFile);
    }

    items.forEach((item, index) => {
        formData.append(`items[${index}][id]`, item.id || '');
        formData.append(`items[${index}][name]`, item.name);
        formData.append(`items[${index}][quantity]`, item.quantity);
        formData.append(`items[${index}][cost]`, item.cost);
    });

    try {
        await businessAPI.createPurchase(formData); // Asumo que existe este método
        notificationSwal('Éxito', 'La compra ha sido registrada correctamente.', 'success');
        // Reset form
        setItems([]);
        setSupplier('');
        setNotes('');
        setReceiptFile(null);
        setGenerateReceipt(false);
    } catch (error) {
        console.error("Error saving purchase:", error);
        notificationSwal('Error', 'Hubo un problema al registrar la compra.', 'error');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Box>
      <CreateProductModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onProductCreated={handleProductCreated}
        businessId={user.business_id}
      />
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Registrar Nueva Compra
      </Typography>
      <Grid container spacing={4}>
        {/* Columna Izquierda: Añadir productos */}
        <Grid item xs={12} md={5}>
          <Card component={Paper} elevation={3}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Añadir Producto a la Compra</Typography>
              <Autocomplete
                open={open}
                onOpen={() => setOpen(true)}
                onClose={() => setOpen(false)}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.name}
                options={options}
                loading={loading}
                value={selectedProduct}
                onChange={(event, newValue) => {
                  setSelectedProduct(newValue);
                  if (newValue) {
                    setCost(newValue.cost);
                  }
                }}
                onInputChange={(event, newInputValue) => {
                  handleSearch(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar producto por nombre o código"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              <Button variant="text" onClick={() => setIsModalOpen(true)} sx={{ mt: 1 }}>
                ¿No encuentras el producto? Créalo aquí
              </Button>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <TextField
                    label="Cantidad"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Costo Unitario"
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Button
                variant="contained"
                startIcon={<AddShoppingCart />}
                onClick={handleAddItem}
                fullWidth
                sx={{ mt: 2, py: 1.5 }}
              >
                Añadir a la Compra
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Columna Derecha: Resumen de la compra */}
        <Grid item xs={12} md={7}>
          <Card component={Paper} elevation={3}>
            <CardContent>
              <Typography variant="h6">Resumen de la Compra</Typography>
              <List>
                {items.map((item, index) => (
                  <ListItem key={index} divider secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveItem(index)}>
                      <Delete />
                    </IconButton>
                  }>
                    <ListItemText
                      primary={item.name}
                      secondary={`${item.quantity} x ${formatCurrency(item.cost)}`}
                    />
                    <Typography variant="body1" fontWeight="bold">{formatCurrency(item.subtotal)}</Typography>
                  </ListItem>
                ))}
                {items.length === 0 && (
                    <Typography sx={{textAlign: 'center', p: 2, color: 'text.secondary'}}>Aún no has añadido productos.</Typography>
                )}
              </List>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Typography variant="h5" fontWeight="bold">Total: {formatCurrency(total)}</Typography>
              </Box>
            </CardContent>
          </Card>

          <Card component={Paper} elevation={3} sx={{ mt: 3 }}>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Datos del Gasto y Factura</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Nombre del Proveedor" value={supplier} onChange={e => setSupplier(e.target.value)} fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField type="date" label="Fecha de Compra" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Notas / Descripción" value={notes} onChange={e => setNotes(e.target.value)} fullWidth multiline rows={2} />
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{display: 'flex', alignItems: 'center'}}>
                        <Button variant="outlined" component="label" startIcon={<UploadFile />}>
                            Subir Factura
                            <input type="file" hidden onChange={e => setReceiptFile(e.target.files[0])} />
                        </Button>
                        {receiptFile && <Chip label={receiptFile.name} onDelete={() => setReceiptFile(null)} sx={{ml: 1}}/>}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControlLabel control={<Switch checked={generateReceipt} onChange={e => setGenerateReceipt(e.target.checked)} />} label="Generar Recibo PDF" />
                    </Grid>
                </Grid>
            </CardContent>
          </Card>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" color="primary" size="large" startIcon={<Save />} onClick={handleSavePurchase} disabled={isSaving || items.length === 0}>
              {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Finalizar y Registrar Compra'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
