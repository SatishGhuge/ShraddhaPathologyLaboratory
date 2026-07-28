import prisma from '../config/database.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';

// ========== HSN CODE MANAGEMENT ==========

export const createHSNCode = async (req, res) => {
  try {
    const { hsnCode, category, gstRate } = req.body;

    if (!hsnCode || !category || gstRate === undefined) {
      return res.status(400).json({
        success: false,
        message: 'HSN Code, category, and GST rate are required'
      });
    }

    const existingCode = await prisma.hSNCode.findUnique({
      where: { hsnCode }
    });

    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: 'HSN Code already exists'
      });
    }

    const newHSNCode = await prisma.hSNCode.create({
      data: { hsnCode, category, gstRate }
    });

    res.status(201).json({
      success: true,
      message: 'HSN Code created successfully',
      data: newHSNCode
    });
  } catch (error) {
    console.error('Create HSN Code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create HSN Code'
    });
  }
};

export const getAllHSNCodes = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const [data, total] = await Promise.all([
      prisma.hSNCode.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: { select: { id: true, itemName: true } } }
      }),
      prisma.hSNCode.count()
    ]);

    res.json(buildPaginatedResponse(data, total, page, limit, 'HSN Codes fetched successfully'));
  } catch (error) {
    console.error('Get HSN Codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch HSN Codes'
    });
  }
};

export const getHSNCodeById = async (req, res) => {
  try {
    const { id } = req.params;

    const hsnCode = await prisma.hSNCode.findUnique({
      where: { id: parseInt(id) },
      include: { items: true }
    });

    if (!hsnCode) {
      return res.status(404).json({
        success: false,
        message: 'HSN Code not found'
      });
    }

    res.json({
      success: true,
      message: 'HSN Code fetched successfully',
      data: hsnCode
    });
  } catch (error) {
    console.error('Get HSN Code by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch HSN Code'
    });
  }
};

export const updateHSNCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, gstRate } = req.body;

    const hsnCode = await prisma.hSNCode.update({
      where: { id: parseInt(id) },
      data: { category, gstRate },
      include: { items: { select: { id: true, itemName: true } } }
    });

    res.json({
      success: true,
      message: 'HSN Code updated successfully',
      data: hsnCode
    });
  } catch (error) {
    console.error('Update HSN Code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update HSN Code'
    });
  }
};

// ========== INVENTORY ITEM MANAGEMENT ==========

export const createInventoryItem = async (req, res) => {
  try {
    const { itemName, itemCode, hsnCodeId, unit } = req.body;

    if (!itemName || !itemCode || !hsnCodeId || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Item name, code, HSN Code ID, and unit are required'
      });
    }

    const existingItem = await prisma.inventoryItem.findUnique({
      where: { itemCode }
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Item code already exists'
      });
    }

    const newItem = await prisma.inventoryItem.create({
      data: { itemName, itemCode, hsnCodeId: parseInt(hsnCodeId), unit },
      include: { hsnCode: true }
    });

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: newItem
    });
  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create inventory item'
    });
  }
};

export const getAllInventoryItems = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const [data, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { hsnCode: true }
      }),
      prisma.inventoryItem.count()
    ]);

    res.json(buildPaginatedResponse(data, total, page, limit, 'Inventory items fetched successfully'));
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory items'
    });
  }
};

export const getAllItemsForDropdown = async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      select: {
        id: true,
        itemName: true,
        itemCode: true,
        unit: true
      },
      orderBy: { itemName: 'asc' }
    });

    res.json({
      success: true,
      message: 'Items fetched successfully',
      data: items
    });
  } catch (error) {
    console.error('Get items for dropdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch items'
    });
  }
};

export const getBatchesByItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    console.log(`[getBatchesByItem] Fetching batches for itemId: ${itemId}`);

    // Fetch batches from stock_entry_items table
    const batches = await prisma.stockEntryItem.findMany({
      where: { itemId: parseInt(itemId) },
      select: {
        id: true,
        batchNo: true,
        quantity: true,
        expiryDate: true,
        stockEntry: {
          select: {
            invoiceNo: true,
            invoiceDate: true
          }
        }
      },
      orderBy: { expiryDate: 'asc' }
    });

    console.log(`[getBatchesByItem] Found ${batches.length} batches`);

    // Format the response
    const formattedBatches = batches.map(batch => ({
      id: batch.id,
      batchNo: batch.batchNo,
      availableQuantity: batch.quantity,
      expiryDate: batch.expiryDate,
      invoiceNo: batch.stockEntry?.invoiceNo,
      invoiceDate: batch.stockEntry?.invoiceDate
    }));

    res.json({
      success: true,
      message: 'Batches fetched successfully',
      data: formattedBatches
    });
  } catch (error) {
    console.error('[getBatchesByItem] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches'
    });
  }
};

export const getInventoryItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await prisma.inventoryItem.findUnique({
      where: { id: parseInt(id) },
      include: { hsnCode: true }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      message: 'Inventory item fetched successfully',
      data: item
    });
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory item'
    });
  }
};

export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemName, hsnCodeId, unit, isActive } = req.body;

    const item = await prisma.inventoryItem.update({
      where: { id: parseInt(id) },
      data: { itemName, hsnCodeId: hsnCodeId ? parseInt(hsnCodeId) : undefined, unit, isActive },
      include: { hsnCode: true }
    });

    res.json({
      success: true,
      message: 'Inventory item updated successfully',
      data: item
    });
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inventory item'
    });
  }
};

export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if item is used in any stock entries
    const stockEntryCount = await prisma.stockEntryItem.count({
      where: { itemId: parseInt(id) }
    });

    if (stockEntryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete this item. It is used in ${stockEntryCount} stock entries.`
      });
    }

    const item = await prisma.inventoryItem.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Inventory item deleted successfully',
      data: item
    });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item: ' + error.message
    });
  }
};

// ========== SUPPLIER MANAGEMENT ==========

export const createSupplier = async (req, res) => {
  try {
    const { supplierName, email, phone, address, city, state, pinCode, gstNumber } = req.body;

    if (!supplierName) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required'
      });
    }

    // Check for duplicate supplier name
    const existingSupplier = await prisma.supplier.findUnique({
      where: { supplierName }
    });

    if (existingSupplier) {
      return res.status(400).json({
        success: false,
        message: 'Supplier with this name already exists'
      });
    }

    // Check for duplicate GST number if provided
    if (gstNumber) {
      const gstExists = await prisma.supplier.findUnique({
        where: { gstNumber }
      });
      if (gstExists) {
        return res.status(400).json({
          success: false,
          message: 'GST Number already exists. Please use a unique GST Number.'
        });
      }
    }

    // Check for duplicate phone if provided
    if (phone) {
      const phoneExists = await prisma.supplier.findUnique({
        where: { phone }
      });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists. Please use a unique phone number.'
        });
      }
    }

    const newSupplier = await prisma.supplier.create({
      data: { supplierName, email, phone, address, city, state, pinCode, gstNumber }
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: newSupplier
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      if (field === 'gstNumber') {
        return res.status(400).json({
          success: false,
          message: 'GST Number already exists. Please use a unique GST Number.'
        });
      }
      if (field === 'phone') {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists. Please use a unique phone number.'
        });
      }
      if (field === 'supplierName') {
        return res.status(400).json({
          success: false,
          message: 'Supplier with this name already exists.'
        });
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create supplier'
    });
  }
};

export const getAllSuppliers = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const [data, total] = await Promise.all([
      prisma.supplier.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.supplier.count()
    ]);

    res.json(buildPaginatedResponse(data, total, page, limit, 'Suppliers fetched successfully'));
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suppliers'
    });
  }
};

export const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) },
      include: { stockEntries: { select: { id: true, entryId: true, invoiceNo: true } } }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier fetched successfully',
      data: supplier
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supplier'
    });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, address, city, state, pinCode, gstNumber, isActive } = req.body;

    // Get the current supplier to compare
    const currentSupplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) }
    });

    if (!currentSupplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Check for duplicate GST number if it's being changed
    if (gstNumber && gstNumber !== currentSupplier.gstNumber) {
      const gstExists = await prisma.supplier.findUnique({
        where: { gstNumber }
      });
      if (gstExists) {
        return res.status(400).json({
          success: false,
          message: 'GST Number already exists. Please use a unique GST Number.'
        });
      }
    }

    // Check for duplicate phone if it's being changed
    if (phone && phone !== currentSupplier.phone) {
      const phoneExists = await prisma.supplier.findUnique({
        where: { phone }
      });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists. Please use a unique phone number.'
        });
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: { email, phone, address, city, state, pinCode, gstNumber, isActive }
    });

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      if (field === 'gstNumber') {
        return res.status(400).json({
          success: false,
          message: 'GST Number already exists. Please use a unique GST Number.'
        });
      }
      if (field === 'phone') {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists. Please use a unique phone number.'
        });
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update supplier'
    });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if supplier is used in any stock entries
    const stockEntryCount = await prisma.stockEntry.count({
      where: { supplierId: parseInt(id) }
    });

    if (stockEntryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete this supplier. It is used in ${stockEntryCount} stock entries.`
      });
    }

    const supplier = await prisma.supplier.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Supplier deleted successfully',
      data: supplier
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete supplier: ' + error.message
    });
  }
};

// ========== STOCK ENTRY MANAGEMENT ==========

export const createStockEntry = async (req, res) => {
  try {
    const { supplierId, invoiceNo, invoiceDate, igstPercent, items, remarks } = req.body;
    const createdBy = (req.adminId || req.userId)?.toString();

    if (!supplierId || !invoiceNo || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier ID, invoice number, and at least one item are required'
      });
    }

    // Fetch supplier to check state for IGST determination
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(supplierId) }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Determine if supplier is from outside Maharashtra for IGST calculation
    const isOutOfMaharashtra = supplier.state && 
      supplier.state.toLowerCase().trim() !== 'maharashtra';

    console.log(`[createStockEntry] Supplier: ${supplier.supplierName}, State: ${supplier.state}, Out of Maharashtra: ${isOutOfMaharashtra}`);

    // Generate unique entryId with pattern: SE + YYMM + 0001
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2); // 26 for 2026
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 07
    const yearMonthPrefix = `SE${year}${month}`;

    // Get the count of entries created in this year-month to generate sequence number
    const countInMonth = await prisma.stockEntry.count({
      where: {
        entryId: { startsWith: yearMonthPrefix }
      }
    });

    const sequence = String(countInMonth + 1).padStart(4, '0');
    let entryId = `${yearMonthPrefix}${sequence}`;
    
    // Verify uniqueness with retry logic just in case of race condition
    let retryCount = 0;
    while (retryCount < 5) {
      const existing = await prisma.stockEntry.findUnique({
        where: { entryId }
      });
      
      if (!existing) {
        break; // ID is unique, proceed
      }
      
      // If duplicate found, increment and retry
      retryCount++;
      const newSequence = String(countInMonth + 1 + retryCount).padStart(4, '0');
      entryId = `${yearMonthPrefix}${newSequence}`;
    }

    let totalBasicAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let calculatedIGSTPercent = igstPercent || 0;

    // Process items with automatic IGST/CGST+SGST calculation
    const itemsData = await Promise.all(items.map(async (item) => {
      const basicAmount = item.quantity * item.pricePerUnit;
      
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;
      let finalIGSTPercent = 0;

      if (isOutOfMaharashtra) {
        // For out-of-state suppliers: Use IGST only
        // Fetch HSN code to get GST rate
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: parseInt(item.itemId) },
          include: { hsnCode: true }
        });

        if (inventoryItem && inventoryItem.hsnCode) {
          finalIGSTPercent = inventoryItem.hsnCode.gstRate;
          igstAmount = (basicAmount * finalIGSTPercent) / 100;
          calculatedIGSTPercent = finalIGSTPercent; // Use HSN GST rate as IGST
        } else {
          console.warn(`[createStockEntry] No HSN code found for item ${item.itemId}`);
          igstAmount = 0;
        }

        console.log(`[createStockEntry] Out-of-state item ${item.itemId}: IGST Rate = ${finalIGSTPercent}%, Amount = ${igstAmount}`);
      } else {
        // For Maharashtra suppliers: Use CGST + SGST
        cgstAmount = (basicAmount * item.cgstPercent) / 100;
        sgstAmount = (basicAmount * item.sgstPercent) / 100;
        igstAmount = 0;

        console.log(`[createStockEntry] In-state item ${item.itemId}: CGST = ${item.cgstPercent}%, SGST = ${item.sgstPercent}%`);
      }

      const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount;

      totalBasicAmount += basicAmount;
      totalCGST += cgstAmount;
      totalSGST += sgstAmount;
      totalIGST += igstAmount;

      return {
        ...item,
        basicAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount,
        finalIGSTPercent
      };
    }));

    const grandTotal = totalBasicAmount + totalCGST + totalSGST + totalIGST;

    // Prepare tax type and summary for clarity
    const taxType = isOutOfMaharashtra ? "IGST" : "CGST_SGST";
    const taxSummary = isOutOfMaharashtra ? 
      {
        taxType: "IGST",
        description: "Integrated GST (Out-of-State Supply)",
        taxRate: calculatedIGSTPercent,
        totalTaxAmount: totalIGST
      } : 
      {
        taxType: "CGST_SGST",
        description: "Combined State GST (In-State Supply)",
        cgstRate: itemsData.length > 0 ? parseFloat(itemsData[0].cgstPercent || 0) : 0,
        sgstRate: itemsData.length > 0 ? parseFloat(itemsData[0].sgstPercent || 0) : 0,
        totalCGST: totalCGST,
        totalSGST: totalSGST,
        totalTaxAmount: totalCGST + totalSGST
      };

    const stockEntry = await prisma.stockEntry.create({
      data: {
        entryId,
        supplierId: parseInt(supplierId),
        invoiceNo,
        invoiceDate: new Date(invoiceDate),
        igstPercent: calculatedIGSTPercent,
        totalBasicAmount,
        totalCGST,
        totalSGST,
        totalIGST,
        grandTotal,
        remarks,
        createdBy,
        items: {
          create: itemsData.map(item => ({
            itemId: parseInt(item.itemId),
            batchNo: item.batchNo,
            expiryDate: new Date(item.expiryDate),
            quantity: parseInt(item.quantity),
            pricePerUnit: parseFloat(item.pricePerUnit),
            basicAmount: item.basicAmount,
            cgstPercent: parseFloat(isOutOfMaharashtra ? 0 : item.cgstPercent),
            cgstAmount: item.cgstAmount,
            sgstPercent: parseFloat(isOutOfMaharashtra ? 0 : item.sgstPercent),
            sgstAmount: item.sgstAmount,
            igstPercent: parseFloat(item.finalIGSTPercent || 0),
            igstAmount: item.igstAmount,
            totalAmount: item.totalAmount
          }))
        }
      },
      include: { items: { include: { item: true } }, supplier: true }
    });

    // Populate LabStock from StockEntry items
    for (const item of itemsData) {
      const labStockKey = `${item.itemId}-${item.batchNo}`;
      
      // Check if lab stock already exists for this item+batch combination
      const existingLabStock = await prisma.labStock.findUnique({
        where: {
          itemId_batchNo: {
            itemId: parseInt(item.itemId),
            batchNo: item.batchNo
          }
        }
      });

      if (existingLabStock) {
        // Update existing lab stock by adding quantity
        await prisma.labStock.update({
          where: {
            itemId_batchNo: {
              itemId: parseInt(item.itemId),
              batchNo: item.batchNo
            }
          },
          data: {
            quantityAvailable: existingLabStock.quantityAvailable + parseInt(item.quantity),
            lastStockUpdate: new Date()
          }
        });
      } else {
        // Create new lab stock entry
        await prisma.labStock.create({
          data: {
            itemId: parseInt(item.itemId),
            batchNo: item.batchNo,
            expiryDate: new Date(item.expiryDate),
            quantityAvailable: parseInt(item.quantity),
            lastStockUpdate: new Date()
          }
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Stock entry created successfully and lab stock updated',
      data: {
        ...stockEntry,
        taxType: taxType,
        taxSummary: taxSummary,
        supplierInfo: {
          id: stockEntry.supplier.id,
          name: stockEntry.supplier.supplierName,
          state: stockEntry.supplier.state,
          isOutOfState: isOutOfMaharashtra
        }
      }
    });
  } catch (error) {
    console.error('Create stock entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stock entry: ' + error.message,
      stack: error.stack
    });
  }
};

export const getAllStockEntries = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const [data, total] = await Promise.all([
      prisma.stockEntry.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: true, items: { include: { item: true } } }
      }),
      prisma.stockEntry.count()
    ]);

    res.json(buildPaginatedResponse(data, total, page, limit, 'Stock entries fetched successfully'));
  } catch (error) {
    console.error('Get stock entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock entries'
    });
  }
};

export const getStockEntryById = async (req, res) => {
  try {
    const { id } = req.params;

    const stockEntry = await prisma.stockEntry.findUnique({
      where: { id: parseInt(id) },
      include: { supplier: true, items: { include: { item: { include: { hsnCode: true } } } } }
    });

    if (!stockEntry) {
      return res.status(404).json({
        success: false,
        message: 'Stock entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Stock entry fetched successfully',
      data: stockEntry
    });
  } catch (error) {
    console.error('Get stock entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock entry'
    });
  }
};

export const deleteStockEntry = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if stock entry exists
    const stockEntry = await prisma.stockEntry.findUnique({
      where: { id: parseInt(id) },
      include: { items: true }
    });

    if (!stockEntry) {
      return res.status(404).json({
        success: false,
        message: 'Stock entry not found'
      });
    }

    // Get all batch numbers from this stock entry items
    const batchNumbers = stockEntry.items.map(item => item.batchNo);
    const itemIds = stockEntry.items.map(item => item.itemId);

    // Delete all stock transactions related to these items and batches
    await prisma.stockTransaction.deleteMany({
      where: {
        AND: [
          { itemId: { in: itemIds } },
          { batchNo: { in: batchNumbers } }
        ]
      }
    });

    // Delete all LabStock entries related to these items and batches
    for (const item of stockEntry.items) {
      await prisma.labStock.deleteMany({
        where: {
          AND: [
            { itemId: item.itemId },
            { batchNo: item.batchNo }
          ]
        }
      });
    }

    // Delete all associated stock entry items
    await prisma.stockEntryItem.deleteMany({
      where: { stockEntryId: parseInt(id) }
    });

    // Delete the stock entry
    const deletedEntry = await prisma.stockEntry.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Stock entry, lab stock, and related transactions deleted successfully',
      data: deletedEntry
    });
  } catch (error) {
    console.error('Delete stock entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete stock entry: ' + error.message
    });
  }
};

// Update Stock Entry
export const updateStockEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplierId, invoiceNo, invoiceDate, items, remarks } = req.body;

    if (!supplierId || !invoiceNo || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier ID, invoice number, and at least one item are required'
      });
    }

    // Check if stock entry exists
    const stockEntry = await prisma.stockEntry.findUnique({
      where: { id: parseInt(id) },
      include: { items: true }
    });

    if (!stockEntry) {
      return res.status(404).json({
        success: false,
        message: 'Stock entry not found'
      });
    }

    // Fetch supplier to check state for IGST determination
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(supplierId) }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Determine if supplier is from outside Maharashtra for IGST calculation
    const isOutOfMaharashtra = supplier.state && 
      supplier.state.toLowerCase().trim() !== 'maharashtra';

    let totalBasicAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let calculatedIGSTPercent = 0;

    // Process items with automatic IGST/CGST+SGST calculation
    const itemsData = await Promise.all(items.map(async (item) => {
      const basicAmount = item.quantity * item.pricePerUnit;
      
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;
      let finalIGSTPercent = 0;

      if (isOutOfMaharashtra) {
        // For out-of-state suppliers: Use IGST only
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: parseInt(item.itemId) },
          include: { hsnCode: true }
        });

        if (inventoryItem && inventoryItem.hsnCode) {
          finalIGSTPercent = inventoryItem.hsnCode.gstRate;
          igstAmount = (basicAmount * finalIGSTPercent) / 100;
          calculatedIGSTPercent = finalIGSTPercent;
        } else {
          igstAmount = 0;
        }
      } else {
        // For Maharashtra suppliers: Use CGST + SGST
        cgstAmount = (basicAmount * item.cgstPercent) / 100;
        sgstAmount = (basicAmount * item.sgstPercent) / 100;
        igstAmount = 0;
      }

      const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount;

      totalBasicAmount += basicAmount;
      totalCGST += cgstAmount;
      totalSGST += sgstAmount;
      totalIGST += igstAmount;

      return {
        ...item,
        basicAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount,
        finalIGSTPercent
      };
    }));

    const grandTotal = totalBasicAmount + totalCGST + totalSGST + totalIGST;

    // Delete old items
    await prisma.stockEntryItem.deleteMany({
      where: { stockEntryId: parseInt(id) }
    });

    // Update stock entry
    const updatedEntry = await prisma.stockEntry.update({
      where: { id: parseInt(id) },
      data: {
        supplierId: parseInt(supplierId),
        invoiceNo,
        invoiceDate: new Date(invoiceDate),
        totalBasicAmount,
        totalCGST,
        totalSGST,
        totalIGST,
        grandTotal,
        remarks,
        updatedAt: new Date(),
        items: {
          create: itemsData.map(item => ({
            itemId: parseInt(item.itemId),
            batchNo: item.batchNo,
            expiryDate: new Date(item.expiryDate),
            quantity: parseInt(item.quantity),
            pricePerUnit: parseFloat(item.pricePerUnit),
            basicAmount: item.basicAmount,
            cgstPercent: item.cgstPercent,
            cgstAmount: item.cgstAmount,
            sgstPercent: item.sgstPercent,
            sgstAmount: item.sgstAmount,
            igstPercent: item.finalIGSTPercent,
            igstAmount: item.igstAmount,
            totalAmount: item.totalAmount
          }))
        }
      },
      include: { items: true }
    });

    res.json({
      success: true,
      message: 'Stock entry updated successfully',
      data: updatedEntry
    });
  } catch (error) {
    console.error('Update stock entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock entry: ' + error.message
    });
  }
};

// ========== LAB STOCK MANAGEMENT ==========

export const getLabStocks = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const [data, total] = await Promise.all([
      prisma.labStock.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { item: { include: { hsnCode: true } } }
      }),
      prisma.labStock.count()
    ]);

    res.json(buildPaginatedResponse(data, total, page, limit, 'Lab stocks fetched successfully'));
  } catch (error) {
    console.error('Get lab stocks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab stocks'
    });
  }
};

export const getLabStockByItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const stocks = await prisma.labStock.findMany({
      where: { itemId: parseInt(itemId) },
      include: { item: { include: { hsnCode: true } } }
    });

    res.json({
      success: true,
      message: 'Lab stocks fetched successfully',
      data: stocks
    });
  } catch (error) {
    console.error('Get lab stock by item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab stocks'
    });
  }
};

// ========== STOCK TRANSACTION MANAGEMENT ==========

export const createStockTransaction = async (req, res) => {
  try {
    const { itemId, organizationId, batchNo, quantity, transactionType, reason } = req.body;
    const createdBy = (req.adminId || req.userId)?.toString();

    if (!itemId || !batchNo || !quantity || !transactionType) {
      return res.status(400).json({
        success: false,
        message: 'Item ID, batch number, quantity, and transaction type are required'
      });
    }

    // Generate unique transactionId with pattern: TXN + YYMM + 0001
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2); // 26 for 2026
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 07
    const yearMonthPrefix = `TXN${year}${month}`;

    // Get the count of transactions created in this year-month
    const countInMonth = await prisma.stockTransaction.count({
      where: {
        transactionId: { startsWith: yearMonthPrefix }
      }
    });

    const sequence = String(countInMonth + 1).padStart(4, '0');
    let transactionId = `${yearMonthPrefix}${sequence}`;
    
    // Verify uniqueness with retry logic just in case of race condition
    let retryCount = 0;
    while (retryCount < 5) {
      const existing = await prisma.stockTransaction.findUnique({
        where: { transactionId }
      });
      
      if (!existing) {
        break; // ID is unique, proceed
      }
      
      // If duplicate found, increment and retry
      retryCount++;
      const newSequence = String(countInMonth + 1 + retryCount).padStart(4, '0');
      transactionId = `${yearMonthPrefix}${newSequence}`;
    }

    const transaction = await prisma.stockTransaction.create({
      data: {
        transactionId,
        itemId: parseInt(itemId),
        organizationId,
        batchNo,
        quantity: parseInt(quantity),
        transactionType,
        reason,
        createdBy
      },
      include: { item: true, organization: true }
    });

    // Update LabStock based on transaction type
    const labStock = await prisma.labStock.findUnique({
      where: {
        itemId_batchNo: {
          itemId: parseInt(itemId),
          batchNo
        }
      }
    });

    if (labStock) {
      let newQuantity = labStock.quantityAvailable;

      if (transactionType === 'OUT' || transactionType === 'DAMAGED' || transactionType === 'LOSS') {
        // Decrease quantity
        newQuantity = Math.max(0, labStock.quantityAvailable - parseInt(quantity));
      } else if (transactionType === 'IN' || transactionType === 'RETURN') {
        // Increase quantity
        newQuantity = labStock.quantityAvailable + parseInt(quantity);
      } else if (transactionType === 'EXPIRY') {
        // Mark as expired (set to 0)
        newQuantity = 0;
      }

      await prisma.labStock.update({
        where: {
          itemId_batchNo: {
            itemId: parseInt(itemId),
            batchNo
          }
        },
        data: {
          quantityAvailable: newQuantity,
          lastStockUpdate: new Date()
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Stock transaction created successfully and lab stock updated',
      data: transaction
    });
  } catch (error) {
    console.error('Create stock transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stock transaction'
    });
  }
};

export const getAllStockTransactions = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { transactionType, itemId, organizationId } = req.query;

    const where = {};
    if (transactionType) where.transactionType = transactionType;
    if (itemId) where.itemId = parseInt(itemId);
    if (organizationId) where.organizationId = organizationId;

    const [data, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { item: true, organization: true }
      }),
      prisma.stockTransaction.count({ where })
    ]);

    res.json(buildPaginatedResponse(data, total, page, limit, 'Stock transactions fetched successfully'));
  } catch (error) {
    console.error('Get stock transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock transactions'
    });
  }
};

// ========== LAB TO ORGANIZATION TRANSFER ==========

export const createLabToOrgTransfer = async (req, res) => {
  try {
    const { organizationId, transferDate, items, remarks } = req.body;
    const createdBy = (req.adminId || req.userId)?.toString();

    if (!organizationId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID and at least one item are required'
      });
    }

    console.log('[createLabToOrgTransfer] Starting transfer with organizationId:', organizationId);
    console.log('[createLabToOrgTransfer] Items to transfer:', JSON.stringify(items));

    // Validate that sufficient stock exists for all items before proceeding
    const validationErrors = [];
    for (const item of items) {
      console.log(`[createLabToOrgTransfer] Validating item - ItemId: ${item.itemId}, Batch: ${item.batchNo}`);
      
      const labStock = await prisma.labStock.findUnique({
        where: {
          itemId_batchNo: {
            itemId: parseInt(item.itemId),
            batchNo: item.batchNo
          }
        },
        include: { item: true }
      });

      if (!labStock) {
        validationErrors.push(
          `Stock not found for item batch: ${item.batchNo}`
        );
      } else if (labStock.quantityAvailable < parseInt(item.quantity)) {
        validationErrors.push(
          `Insufficient stock for ${labStock.item.itemName} (Batch: ${item.batchNo}). Available: ${labStock.quantityAvailable}, Requested: ${item.quantity}`
        );
      }
    }

    if (validationErrors.length > 0) {
      console.log('[createLabToOrgTransfer] Validation errors:', validationErrors);
      return res.status(400).json({
        success: false,
        message: 'Stock validation failed',
        errors: validationErrors
      });
    }

    // Generate unique transferId with pattern: T + YY + 0001
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const yearPrefix = `T${year}`;

    // Get the count of transfers created in this year
    const countInYear = await prisma.labToOrgTransfer.count({
      where: {
        transferId: { startsWith: yearPrefix }
      }
    });

    const sequence = String(countInYear + 1).padStart(4, '0');
    let transferId = `${yearPrefix}${sequence}`;
    
    // Verify uniqueness with retry logic
    let retryCount = 0;
    while (retryCount < 5) {
      const existing = await prisma.labToOrgTransfer.findUnique({
        where: { transferId }
      });
      
      if (!existing) {
        break;
      }
      
      retryCount++;
      const newSequence = String(countInYear + 1 + retryCount).padStart(4, '0');
      transferId = `${yearPrefix}${newSequence}`;
    }

    console.log('[createLabToOrgTransfer] Generated transferId:', transferId);

    // Execute all operations within a transaction
    const transfer = await prisma.$transaction(async (tx) => {
      // Step 1: Create the transfer with items
      console.log('[createLabToOrgTransfer] Creating transfer record...');
      
      const newTransfer = await tx.labToOrgTransfer.create({
        data: {
          transferId,
          organizationId,
          transferDate: new Date(transferDate),
          remarks,
          createdBy,
          items: {
            create: items.map(item => ({
              itemId: parseInt(item.itemId),
              batchNo: item.batchNo,
              quantity: parseInt(item.quantity),
              expiryDate: new Date(item.expiryDate)
            }))
          }
        },
        include: { items: { include: { item: true } }, organization: true }
      });

      console.log('[createLabToOrgTransfer] Transfer record created:', newTransfer.id);

      // Step 2: Reduce LabStock and create/update OrganizationStock for each item
      for (const item of items) {
        const transferQty = parseInt(item.quantity);
        const itemId = parseInt(item.itemId);
        const batchNo = item.batchNo;

        console.log(`[createLabToOrgTransfer] Processing item - ItemId: ${itemId}, Batch: ${batchNo}, Qty: ${transferQty}`);

        try {
          // STEP 2A: Reduce LabStock quantity
          console.log(`  Updating LabStock with key: itemId=${itemId}, batchNo=${batchNo}`);
          const updatedLabStock = await tx.labStock.update({
            where: { itemId_batchNo: { itemId, batchNo } },
            data: {
              quantityAvailable: {
                decrement: transferQty
              },
              lastStockUpdate: new Date()
            }
          });

          console.log(`[createLabToOrgTransfer] ✓ LabStock Updated - ItemId: ${itemId}, Batch: ${batchNo}, Qty Reduced: ${transferQty}, Remaining: ${updatedLabStock.quantityAvailable}`);

          // STEP 2B: Create or update OrganizationStock using upsert
          console.log(`  Upserting OrgStock with orgId=${organizationId}, itemId=${itemId}, batch=${batchNo}`);
          const updatedOrgStock = await tx.organizationStock.upsert({
            where: {
              organizationId_itemId_batchNo: {
                organizationId,
                itemId,
                batchNo
              }
            },
            update: {
              quantityAvailable: {
                increment: transferQty
              },
              lastStockUpdate: new Date()
            },
            create: {
              organizationId,
              itemId,
              batchNo,
              expiryDate: new Date(item.expiryDate),
              quantityAvailable: transferQty,
              lastStockUpdate: new Date()
            }
          });

          console.log(`[createLabToOrgTransfer] ✓ OrgStock Updated/Created - OrgId: ${organizationId}, ItemId: ${itemId}, Batch: ${batchNo}, New Qty: ${updatedOrgStock.quantityAvailable}`);
        } catch (itemError) {
          console.error(`[ERROR] Failed to process item ${itemId}:`, itemError);
          throw itemError;
        }
      }

      return newTransfer;
    });

    console.log('[createLabToOrgTransfer] ✓✓✓ Transfer completed successfully!');

    res.status(201).json({
      success: true,
      message: 'Lab to organization transfer created successfully and stock updated',
      data: transfer
    });
  } catch (error) {
    console.error('Create lab to org transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transfer: ' + error.message
    });
  }
};

export const getAllLabToOrgTransfers = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { status, organizationId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (organizationId) where.organizationId = organizationId;

    const [data, total] = await Promise.all([
      prisma.labToOrgTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { item: true } }, organization: true }
      }),
      prisma.labToOrgTransfer.count({ where })
    ]);

    res.json(buildPaginatedResponse(data, total, page, limit, 'Transfers fetched successfully'));
  } catch (error) {
    console.error('Get lab to org transfers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transfers'
    });
  }
};

export const updateTransferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, receivedBy } = req.body;

    const transfer = await prisma.labToOrgTransfer.update({
      where: { id: parseInt(id) },
      data: { status, receivedBy },
      include: { items: { include: { item: true } }, organization: true }
    });

    res.json({
      success: true,
      message: 'Transfer status updated successfully',
      data: transfer
    });
  } catch (error) {
    console.error('Update transfer status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transfer status'
    });
  }
};

export const deleteLabToOrgTransfer = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('[deleteLabToOrgTransfer] Deleting transfer ID:', id);

    // Get the transfer with all its items
    const transfer = await prisma.labToOrgTransfer.findUnique({
      where: { id: parseInt(id) },
      include: { items: true }
    });

    if (!transfer) {
      console.log('[deleteLabToOrgTransfer] Transfer not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    console.log('[deleteLabToOrgTransfer] Found transfer:', transfer.transferId, 'OrgId:', transfer.organizationId);

    // Execute all operations within a transaction
    const deletedTransfer = await prisma.$transaction(async (tx) => {
      // Step 1: Restore LabStock and reduce OrganizationStock for each transferred item
      for (const item of transfer.items) {
        const transferQty = item.quantity;
        const itemId = item.itemId;
        const batchNo = item.batchNo;

        console.log(`[deleteLabToOrgTransfer] Processing item - ItemId: ${itemId}, Batch: ${batchNo}, Qty: ${transferQty}`);

        // Restore LabStock - add back the transferred quantity
        const restoredLabStock = await tx.labStock.update({
          where: {
            itemId_batchNo: {
              itemId,
              batchNo
            }
          },
          data: {
            quantityAvailable: {
              increment: transferQty
            },
            lastStockUpdate: new Date()
          }
        });

        console.log(`[deleteLabToOrgTransfer] ✓ LabStock Restored - ItemId: ${itemId}, Batch: ${batchNo}, Qty Added: ${transferQty}, New Total: ${restoredLabStock.quantityAvailable}`);

        // Reduce OrganizationStock or delete if quantity becomes 0
        const orgStockKey = {
          organizationId_itemId_batchNo: {
            organizationId: transfer.organizationId,
            itemId,
            batchNo
          }
        };

        const orgStock = await tx.organizationStock.findUnique({
          where: orgStockKey
        });

        if (orgStock) {
          const newQuantity = orgStock.quantityAvailable - transferQty;

          if (newQuantity <= 0) {
            // Delete organization stock if quantity becomes 0 or negative
            await tx.organizationStock.delete({
              where: orgStockKey
            });
            console.log(`[deleteLabToOrgTransfer] ✓ OrgStock Deleted - OrgId: ${transfer.organizationId}, ItemId: ${itemId}, Batch: ${batchNo}`);
          } else {
            // Update organization stock quantity
            const updatedOrgStock = await tx.organizationStock.update({
              where: orgStockKey,
              data: {
                quantityAvailable: newQuantity,
                lastStockUpdate: new Date()
              }
            });
            console.log(`[deleteLabToOrgTransfer] ✓ OrgStock Updated - OrgId: ${transfer.organizationId}, ItemId: ${itemId}, Batch: ${batchNo}, New Qty: ${updatedOrgStock.quantityAvailable}`);
          }
        }
      }

      // Step 2: Delete all transfer items
      await tx.labToOrgTransferItem.deleteMany({
        where: { transferId: parseInt(id) }
      });

      // Step 3: Delete the transfer
      const deleted = await tx.labToOrgTransfer.delete({
        where: { id: parseInt(id) }
      });

      return deleted;
    });

    console.log('[deleteLabToOrgTransfer] ✓✓✓ Transfer deleted successfully!');

    res.json({
      success: true,
      message: 'Transfer deleted successfully and stock restored',
      data: deletedTransfer
    });
  } catch (error) {
    console.error('Delete lab to org transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transfer: ' + error.message
    });
  }
};

// ========== ORGANIZATION STOCK MANAGEMENT ==========

export const getOrganizationStocks = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { organizationId } = req.query;

    const where = organizationId ? { organizationId } : {};

    const [data, total] = await Promise.all([
      prisma.organizationStock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { organization: true, item: { include: { hsnCode: true } } }
      }),
      prisma.organizationStock.count({ where })
    ]);

    res.json(buildPaginatedResponse(data, total, page, limit, 'Organization stocks fetched successfully'));
  } catch (error) {
    console.error('Get organization stocks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization stocks'
    });
  }
};

// ========== INVENTORY SUMMARY ==========

export const getInventorySummary = async (req, res) => {
  try {
    const [
      totalItems,
      totalSuppliers,
      totalStockEntries,
      lowStockItems,
      expiredItems,
      pendingTransfers
    ] = await Promise.all([
      prisma.inventoryItem.count({ where: { isActive: true } }),
      prisma.supplier.count({ where: { isActive: true } }),
      prisma.stockEntry.count(),
      prisma.labStock.findMany({
        where: { quantityAvailable: { lte: 10 } },
        include: { item: true }
      }),
      prisma.labStock.findMany({
        where: { expiryDate: { lte: new Date() } },
        include: { item: true }
      }),
      prisma.labToOrgTransfer.count({ where: { status: 'Pending' } })
    ]);

    res.json({
      success: true,
      message: 'Inventory summary fetched successfully',
      data: {
        totalItems,
        totalSuppliers,
        totalStockEntries,
        lowStockCount: lowStockItems.length,
        expiredStockCount: expiredItems.length,
        pendingTransfers,
        lowStockItems: lowStockItems.slice(0, 5),
        expiredItems: expiredItems.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Get inventory summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory summary'
    });
  }
};

// ========== PROCESS EXISTING STOCK ENTRIES TO LAB STOCK ==========
export const processStockEntriesToLabStock = async (req, res) => {
  try {
    // Get all stock entries with their items
    const stockEntries = await prisma.stockEntry.findMany({
      include: { items: true }
    });

    let processedCount = 0;
    let updatedCount = 0;

    for (const entry of stockEntries) {
      for (const item of entry.items) {
        // Check if lab stock already exists
        const existingLabStock = await prisma.labStock.findUnique({
          where: {
            itemId_batchNo: {
              itemId: item.itemId,
              batchNo: item.batchNo
            }
          }
        });

        if (existingLabStock) {
          // Update if exists
          await prisma.labStock.update({
            where: {
              itemId_batchNo: {
                itemId: item.itemId,
                batchNo: item.batchNo
              }
            },
            data: {
              quantityAvailable: existingLabStock.quantityAvailable + item.quantity,
              lastStockUpdate: new Date()
            }
          });
          updatedCount++;
        } else {
          // Create if doesn't exist
          await prisma.labStock.create({
            data: {
              itemId: item.itemId,
              batchNo: item.batchNo,
              expiryDate: item.expiryDate,
              quantityAvailable: item.quantity,
              lastStockUpdate: new Date()
            }
          });
          processedCount++;
        }
      }
    }

    res.json({
      success: true,
      message: 'Stock entries processed successfully',
      data: {
        newLabStocksCreated: processedCount,
        existingLabStocksUpdated: updatedCount,
        totalStockEntriesProcessed: stockEntries.length
      }
    });
  } catch (error) {
    console.error('Process stock entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process stock entries: ' + error.message
    });
  }
};
