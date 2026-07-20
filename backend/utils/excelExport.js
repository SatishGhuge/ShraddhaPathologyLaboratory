import ExcelJS from 'exceljs';
import { prisma } from '../config/database.js';

/**
 * Export tests with parameters and categories to Excel
 * Creates multi-sheet workbook: Tests, Parameters, Categories
 */
export const exportTestsToExcel = async () => {
  try {
    // Fetch all tests with relations
    const tests = await prisma.test.findMany({
      where: { isDeleted: false },
      include: {
        department: { select: { id: true, name: true } },
        sample_type: { select: { id: true, Sample_Type: true } },
        ownedParameters: {
          include: {
            unit: { select: { id: true, symbol: true } }
          }
        },
        categories: true
      },
      orderBy: { name: 'asc' }
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();

    // ==================== SHEET 1: TESTS ====================
    const testsSheet = workbook.addWorksheet('Tests');
    
    testsSheet.columns = [
      { header: 'Test Name', key: 'name', width: 25 },
      { header: 'Short Name', key: 'shortName', width: 15 },
      { header: 'Test Code', key: 'testCode', width: 15 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Sample Type', key: 'sampleType', width: 15 },
      { header: 'Machine Name', key: 'machineName', width: 15 },
      { header: 'Group', key: 'group', width: 15 },
      { header: 'Report Header', key: 'reportHeader', width: 20 },
      { header: 'Preparation Type', key: 'preparationType', width: 15 },
      { header: 'Is NABL', key: 'isNABL', width: 10 },
      { header: 'Profile Test', key: 'profileTest', width: 10 },
      { header: 'Is Header', key: 'isHeader', width: 10 },
      { header: 'Show Test Name', key: 'showTestName', width: 10 },
      { header: 'Line Height', key: 'lineHeight', width: 10 },
      { header: 'Attach File', key: 'attachFile', width: 10 },
      { header: 'Image Size', key: 'imageSize', width: 15 },
      { header: 'Outsource Lab', key: 'outsourceLab', width: 15 },
      { header: 'Is Active', key: 'isActive', width: 10 },
      { header: 'Instructions Preparation', key: 'instructionPreparation', width: 30 },
      { header: 'Instructions Patient', key: 'instructionPatient', width: 30 },
      { header: 'Interpretation Label', key: 'interpretationLabel', width: 20 },
      { header: 'Interpretation', key: 'interpretation', width: 30 }
    ];

    // Add test rows
    tests.forEach(test => {
      testsSheet.addRow({
        name: test.name,
        shortName: test.shortName || '',
        testCode: test.testCode || '',
        department: test.department?.name || '',
        sampleType: test.sample_type?.Sample_Type || '',
        machineName: test.machineName || '',
        group: test.group || '',
        reportHeader: test.reportHeader || '',
        preparationType: test.preparationType || '',
        isNABL: test.isNABL ? 'Yes' : 'No',
        profileTest: test.profileTest ? 'Yes' : 'No',
        isHeader: test.isHeader ? 'Yes' : 'No',
        showTestName: test.showTestName ? 'Yes' : 'No',
        lineHeight: test.lineHeight || 1.4,
        attachFile: test.attachFile ? 'Yes' : 'No',
        imageSize: test.imageSize || '800|600',
        outsourceLab: test.outsourceLab || '',
        isActive: test.isActive ? 'Yes' : 'No',
        instructionPreparation: test.instructionPreparation || '',
        instructionPatient: test.instructionPatient || '',
        interpretationLabel: test.interpretationLabel || '',
        interpretation: test.interpretation || ''
      });
    });

    // Format header row
    testsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    testsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    testsSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'center', wrapText: true };

    // ==================== SHEET 2: PARAMETERS ====================
    const parametersSheet = workbook.addWorksheet('Parameters');
    
    parametersSheet.columns = [
      { header: 'Test Name', key: 'testName', width: 25 },
      { header: 'Parameter Name', key: 'parameterName', width: 25 },
      { header: 'Parameter Code', key: 'parameterCode', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Decimal Places', key: 'decimal', width: 12 },
      { header: 'Is Mandatory', key: 'isMandatory', width: 12 },
      { header: 'Is Descriptive', key: 'isDescriptive', width: 12 },
      { header: 'Test Method', key: 'testMethod', width: 15 },
      { header: 'Has Formula', key: 'hasFormula', width: 12 },
      { header: 'Formula', key: 'formula', width: 20 },
      { header: 'Low Panic', key: 'lowPanic', width: 12 },
      { header: 'High Panic', key: 'highPanic', width: 12 },
      { header: 'Range Type', key: 'rangeType', width: 12 },
      { header: 'Male Low', key: 'maleLowValue', width: 12 },
      { header: 'Male High', key: 'maleHighValue', width: 12 },
      { header: 'Female Low', key: 'femaleLowValue', width: 12 },
      { header: 'Female High', key: 'femaleHighValue', width: 12 },
      { header: 'Child Low', key: 'childLowValue', width: 12 },
      { header: 'Child High', key: 'childHighValue', width: 12 },
      { header: 'Is NABL', key: 'isNABL', width: 10 },
      { header: 'Is Active', key: 'isActive', width: 10 },
      { header: 'Sort Order', key: 'parameterSortOrder', width: 12 }
    ];

    // Add parameter rows
    tests.forEach(test => {
      test.ownedParameters?.forEach(param => {
        parametersSheet.addRow({
          testName: test.name,
          parameterName: param.parameterName,
          parameterCode: param.parameterCode || '',
          unit: param.unit?.symbol || '',
          type: param.type || 'Numeric',
          decimal: param.decimal || 2,
          isMandatory: param.isMandatory ? 'Yes' : 'No',
          isDescriptive: param.isDescriptive ? 'Yes' : 'No',
          testMethod: param.testMethod || '',
          hasFormula: param.hasFormula ? 'Yes' : 'No',
          formula: param.formula || '',
          lowPanic: param.lowPanic || '',
          highPanic: param.highPanic || '',
          rangeType: param.rangeType || 'BySex',
          maleLowValue: param.maleLowValue || '',
          maleHighValue: param.maleHighValue || '',
          femaleLowValue: param.femaleLowValue || '',
          femaleHighValue: param.femaleHighValue || '',
          childLowValue: param.childLowValue || '',
          childHighValue: param.childHighValue || '',
          isNABL: param.isNABL ? 'Yes' : 'No',
          isActive: param.isActive ? 'Yes' : 'No',
          parameterSortOrder: param.parameterSortOrder || ''
        });
      });
    });

    // Format header row
    parametersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    parametersSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
    parametersSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'center', wrapText: true };

    // ==================== SHEET 3: CATEGORIES ====================
    const categoriesSheet = workbook.addWorksheet('Categories');
    
    categoriesSheet.columns = [
      { header: 'Test Name', key: 'testName', width: 25 },
      { header: 'Category Name', key: 'categoryName', width: 25 },
      { header: 'Category Code', key: 'categoryId', width: 15 },
      { header: 'Is Category', key: 'isCategory', width: 12 },
      { header: 'Test Method', key: 'testMethod', width: 15 },
      { header: 'Sort Order', key: 'sortOrder', width: 12 }
    ];

    // Add category rows
    tests.forEach(test => {
      test.categories?.forEach(cat => {
        categoriesSheet.addRow({
          testName: test.name,
          categoryName: cat.categoryName || '',
          categoryId: cat.categoryId || '',
          isCategory: cat.isCategory ? 'Yes' : 'No',
          testMethod: cat.testMethod || '',
          sortOrder: cat.sortOrder || ''
        });
      });
    });

    // Format header row
    categoriesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    categoriesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    categoriesSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'center', wrapText: true };

    // Auto-fit columns
    [testsSheet, parametersSheet, categoriesSheet].forEach(sheet => {
      sheet.columns.forEach(column => {
        if (column.width < 30) column.width += 2;
      });
    });

    return workbook;

  } catch (error) {
    console.error('Error exporting tests to Excel:', error);
    throw error;
  }
};
