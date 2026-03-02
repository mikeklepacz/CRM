type Deps = {
  and: any;
  categories: any;
  checkAdminAccess: (user: any, tenantId: string) => Promise<boolean>;
  db: any;
  eq: any;
  generateCacheKey: (
    userId: string,
    storeSheetId: string,
    trackerSheetId: string,
    category: string | null,
    projectId?: string
  ) => string;
  getCachedData: (key: string) => any | null;
  googleSheets: { readSheetData: (spreadsheetId: string, range: string) => Promise<any[][]> };
  isNull: any;
  normalizeLink: (value: string) => string;
  or: any;
  setCachedData: (key: string, data: any) => void;
  storage: any;
};

function headerByName(headers: string[], name: string): string | undefined {
  return headers.find((h) => h.toLowerCase().trim() === name.toLowerCase().trim());
}

export function createSheetsMergedDataHandler(deps: Deps) {
  return async (req: any, res: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = (req.user as any).tenantId;
      const user = await deps.storage.getUser(userId);
      const { storeSheetId, trackerSheetId, joinColumn, projectId } = req.body;

      if (!storeSheetId || !trackerSheetId || !joinColumn) {
        return res.status(400).json({ message: "Store sheet ID, tracker sheet ID, and join column are required" });
      }

      const selectedCategory = await deps.storage.getSelectedCategory(userId, tenantId);
      const cacheKey = deps.generateCacheKey(userId, storeSheetId, trackerSheetId, selectedCategory, projectId);
      const cachedData = deps.getCachedData(cacheKey);
      if (cachedData) return res.json(cachedData);

      const storeSheet = await deps.storage.getGoogleSheetById(storeSheetId, tenantId);
      const trackerSheet = await deps.storage.getGoogleSheetById(trackerSheetId, tenantId);
      if (!storeSheet || !trackerSheet) {
        return res.status(404).json({ message: "One or both sheets not found" });
      }

      const storeRows = await deps.googleSheets.readSheetData(storeSheet.spreadsheetId, `${storeSheet.sheetName}!A:ZZ`);
      const trackerRows = await deps.googleSheets.readSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`);
      if (storeRows.length === 0) return res.json({ headers: [], data: [], editableColumns: [] });

      const storeHeaders = storeRows[0];
      const trackerHeaders = trackerRows.length > 0 ? trackerRows[0] : [];
      const storeData = storeRows.slice(1).map((row, index) => {
        const obj: any = { _storeRowIndex: index + 2, _storeSheetId: storeSheetId };
        storeHeaders.forEach((header, i) => (obj[header] = row[i] || ""));
        return obj;
      });
      const trackerData =
        trackerRows.length > 1
          ? trackerRows.slice(1).map((row, index) => {
              const obj: any = { _trackerRowIndex: index + 2, _trackerSheetId: trackerSheetId };
              trackerHeaders.forEach((header, i) => (obj[header] = row[i] || ""));
              return obj;
            })
          : [];

      const actualStoreJoinColumn = storeHeaders.find((h) => h.toLowerCase() === joinColumn.toLowerCase()) || joinColumn;
      const actualTrackerJoinColumn =
        trackerHeaders.find((h) => h.toLowerCase() === joinColumn.toLowerCase()) || joinColumn;

      const isAdminUser = await deps.checkAdminAccess(user, tenantId);
      const userAgentName =
        user?.agentName || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null)?.trim() || null;

      const trackerAgentColumnName =
        trackerHeaders.find((h) => h.toLowerCase().replace(/\s+/g, " ").trim() === "agent name") || null;
      const trackerLinkColumnName = actualTrackerJoinColumn;
      const trackerOwnershipMap = new Map<string, string>();
      if (trackerAgentColumnName && trackerLinkColumnName) {
        trackerData.forEach((row) => {
          const link = deps.normalizeLink((row[trackerLinkColumnName] || "").toString());
          const agentName = (row[trackerAgentColumnName] || "").toString().trim();
          if (link && agentName) trackerOwnershipMap.set(link, agentName);
        });
      }

      const storeJoinColumnName = actualStoreJoinColumn;
      let filteredStoreData = storeData;
      if (!isAdminUser && userAgentName) {
        const userAgentLower = userAgentName.toLowerCase().trim();
        filteredStoreData = storeData.filter((row) => {
          const storeLink = deps.normalizeLink((row[storeJoinColumnName] || "").toString());
          if (!storeLink) return true;
          const ownerAgent = trackerOwnershipMap.get(storeLink);
          if (!ownerAgent) return true;
          return ownerAgent.toLowerCase().trim() === userAgentLower;
        });
      } else if (!isAdminUser && !userAgentName) {
        filteredStoreData = storeData.filter((row) => {
          const storeLink = deps.normalizeLink((row[storeJoinColumnName] || "").toString());
          if (!storeLink) return true;
          return !trackerOwnershipMap.get(storeLink);
        });
      }

      let filteredTrackerData = trackerData;
      if (!isAdminUser && trackerAgentColumnName && userAgentName) {
        filteredTrackerData = trackerData.filter((row) => {
          const rowAgentName = row[trackerAgentColumnName];
          return !rowAgentName || !rowAgentName.trim() || rowAgentName.toLowerCase().trim() === userAgentName.toLowerCase().trim();
        });
      } else if (!isAdminUser && !userAgentName) {
        filteredTrackerData = [];
      }

      const storeCategoryColumnName = headerByName(storeHeaders, "category");
      if (selectedCategory && storeCategoryColumnName && !projectId) {
        filteredStoreData = filteredStoreData.filter((row) => {
          const rowCategory = row[storeCategoryColumnName];
          return rowCategory && rowCategory.toLowerCase().trim() === selectedCategory.toLowerCase().trim();
        });
      }

      const storeLinkColumn = headerByName(storeHeaders, "link");
      const storeParentLinkColumn = headerByName(storeHeaders, "parent link");
      const linkToCategoryMap = new Map<string, string>();
      if (storeLinkColumn && storeCategoryColumnName) {
        filteredStoreData.forEach((row) => {
          const link = row[storeLinkColumn]?.toString().trim().toLowerCase();
          const category = row[storeCategoryColumnName]?.toString().trim().toLowerCase();
          if (link && category) linkToCategoryMap.set(link, category);
        });
      }

      let allowedCategoryNames: string[] = [];
      if (projectId && storeCategoryColumnName) {
        const projectCategories = await deps.db
          .select({ name: deps.categories.name })
          .from(deps.categories)
          .where(
            deps.and(
              deps.eq(deps.categories.tenantId, tenantId),
              deps.or(deps.eq(deps.categories.projectId, projectId), deps.isNull(deps.categories.projectId))
            )
          );

        allowedCategoryNames = projectCategories.map((c: any) => c.name.toLowerCase().trim());
        if (allowedCategoryNames.length === 0) {
          filteredStoreData = [];
        } else {
          filteredStoreData = filteredStoreData.filter((row) => {
            const rowCategory = row[storeCategoryColumnName]?.toString().trim().toLowerCase();
            if (rowCategory && allowedCategoryNames.includes(rowCategory)) return true;
            if (!storeParentLinkColumn) return false;
            const parentLink = row[storeParentLinkColumn]?.toString().trim().toLowerCase();
            if (!parentLink) return false;
            const parentCategory = linkToCategoryMap.get(parentLink);
            return !!(parentCategory && allowedCategoryNames.includes(parentCategory));
          });
        }
      }

      const storeOpenColumnName = headerByName(storeHeaders, "open");
      if (storeOpenColumnName) {
        filteredStoreData = filteredStoreData.filter((row) => {
          const openValue = row[storeOpenColumnName];
          return !openValue || openValue.toLowerCase().trim() !== "false";
        });
      }

      const mergedDataMap = new Map();
      filteredStoreData.forEach((storeRow, index) => {
        const normalizedJoinValue = deps.normalizeLink(storeRow[actualStoreJoinColumn]);
        const trackerRow =
          filteredTrackerData.find(
            (tr) => deps.normalizeLink(tr[actualTrackerJoinColumn]) === normalizedJoinValue && normalizedJoinValue
          ) || {};
        mergedDataMap.set(`store-${index}`, {
          ...storeRow,
          ...trackerRow,
          _hasTrackerData: Object.keys(trackerRow).length > 0,
          _deletedFromStore: false,
        });
      });

      filteredTrackerData.forEach((trackerRow) => {
        const normalizedJoinValue = deps.normalizeLink(trackerRow[actualTrackerJoinColumn]);
        const alreadyMerged = filteredStoreData.some(
          (sr) => deps.normalizeLink(sr[actualStoreJoinColumn]) === normalizedJoinValue && normalizedJoinValue
        );
        if (alreadyMerged) return;

        if (projectId && allowedCategoryNames.length > 0) {
          const trackerLinkColumn = headerByName(trackerHeaders, "link");
          const trackerParentLinkColumn = headerByName(trackerHeaders, "parent link");
          let hasValidCategory = false;

          if (trackerLinkColumn) {
            const trackerLink = trackerRow[trackerLinkColumn]?.toString().trim().toLowerCase();
            if (trackerLink && linkToCategoryMap.has(trackerLink)) {
              const category = linkToCategoryMap.get(trackerLink);
              if (category && allowedCategoryNames.includes(category)) hasValidCategory = true;
            }
          }
          if (!hasValidCategory && trackerParentLinkColumn) {
            const parentLink = trackerRow[trackerParentLinkColumn]?.toString().trim().toLowerCase();
            if (parentLink && linkToCategoryMap.has(parentLink)) {
              const parentCategory = linkToCategoryMap.get(parentLink);
              if (parentCategory && allowedCategoryNames.includes(parentCategory)) hasValidCategory = true;
            }
          }

          if (!hasValidCategory) return;
        }

        mergedDataMap.set(`tracker-${trackerRow._trackerRowIndex}`, {
          ...trackerRow,
          _hasTrackerData: true,
          _deletedFromStore: true,
        });
      });

      let mergedData = Array.from(mergedDataMap.values());
      const parentLinkColumn = headerByName(trackerHeaders, "parent link");
      if (parentLinkColumn) {
        mergedData = mergedData.filter((row: any) => {
          const parentLinkValue = row[parentLinkColumn];
          return !parentLinkValue || parentLinkValue.toString().trim() === "";
        });
      }

      if (!isAdminUser) {
        const userAgentLower = userAgentName?.toLowerCase().trim() || "";
        mergedData = mergedData.filter((row: any) => {
          const rowLink = deps.normalizeLink((row[actualStoreJoinColumn] || row[actualTrackerJoinColumn] || "").toString());
          if (!rowLink) return true;
          const ownerAgent = trackerOwnershipMap.get(rowLink);
          if (!ownerAgent) return true;
          if (!userAgentLower) return false;
          return ownerAgent.toLowerCase().trim() === userAgentLower;
        });
      }

      const allHeaders = [...storeHeaders];
      trackerHeaders.forEach((header: string) => {
        if (!allHeaders.some((h: string) => h.toLowerCase() === header.toLowerCase())) allHeaders.push(header);
      });

      const agentCol = headerByName(trackerHeaders, "agent");
      const excludedCols = [agentCol, joinColumn].filter(Boolean).map((c: string) => c.toLowerCase());
      const agentReadOnlyColumns = ["order id", "commission type", "amount", "transaction id"];

      let editableColumns = [
        ...trackerHeaders.filter((h: string) => !excludedCols.includes(h.toLowerCase())),
        "additional phone",
        "additional email",
        "dba",
        "agent name",
      ].filter((col) => allHeaders.some((h: string) => h.toLowerCase() === col.toLowerCase()));

      if (!isAdminUser) {
        editableColumns = editableColumns.filter((col) => !agentReadOnlyColumns.includes(col.toLowerCase()));
      }

      const responseData = {
        headers: allHeaders,
        data: mergedData,
        editableColumns,
        storeSheetId,
        trackerSheetId,
        storeHeaders,
        trackerHeaders,
      };

      deps.setCachedData(cacheKey, responseData);
      return res.json(responseData);
    } catch (error: any) {
      console.error("Error fetching merged data:", error);
      return res.status(500).json({ message: error.message || "Failed to fetch merged data" });
    }
  };
}
