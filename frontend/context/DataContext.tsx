
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Kitchen, Product, OperationEntry, DashboardStats, SubscriptionPlan, Category, Organization, User } from '../types';
import { useAuth } from './AuthContext';
import { organizationsService } from '../api/services/organizations';
import { usersService } from '../api/services/users';
import { kitchensService } from '../api/services/kitchens';
import { categoriesService } from '../api/services/categories';
import { productsService } from '../api/services/products';
import { operationsService } from '../api/services/operations';

interface DataContextType {
  // SaaS Admin Data
  organizations: Organization[];
  addOrganization: (org: Omit<Organization, 'id' | 'createdAt'>) => void;
  updateOrganization: (id: string | number, updates: Partial<Organization>) => void;

  // User Management Data
  users: User[];
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string | number, updates: Partial<User>) => void;
  deleteUser: (id: string | number) => void;

  // Tenant Data (Filtered)
  currentOrganization: Organization | null;
  kitchens: Kitchen[];
  products: Product[];
  categories: Category[];
  operations: OperationEntry[];
  stats: DashboardStats;
  subscription: SubscriptionPlan;
  loading: boolean;

  // Actions
  upgradeSubscription: (plan: SubscriptionPlan) => void;
  addKitchen: (kitchen: Omit<Kitchen, 'id' | 'createdAt' | 'organizationId'>) => Promise<{ success: boolean; error?: string }>;
  updateKitchen: (id: string | number, updates: Partial<Kitchen>) => void;
  deleteKitchen: (id: string | number) => void;
  addProduct: (product: Omit<Product, 'id' | 'organizationId'>) => Promise<{ success: boolean; error?: string }>;
  updateProduct: (id: string | number, updates: Partial<Product>) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (id: string | number) => void;
  addCategory: (name: string) => void;
  updateCategory: (id: string | number, name: string) => void;
  deleteCategory: (id: string | number) => void;
  addOperation: (operation: Omit<OperationEntry, 'id' | 'organizationId'>) => void;
  updateOperation: (id: string | number, updates: Partial<OperationEntry>) => void;
  deleteOperation: (id: string | number) => void;
  fetchFilteredOperations: (params: Record<string, string>) => Promise<OperationEntry[]>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

const normalizeOperation = (op: OperationEntry): OperationEntry => ({
  ...op,
  quantity: Number(op.quantity) || 0,
  price: op.price != null ? Number(op.price) : undefined,
});

const normalizeOrg = (o: Organization): Organization => ({
  ...o,
  mrr: Number(o.mrr) || 0,
  taxRate: o.taxRate != null ? Number(o.taxRate) : undefined,
  maxKitchens: Number(o.maxKitchens) || 1,
  maxUsers: Number(o.maxUsers) || 5,
});

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { organizationId, userRole, isAuthenticated } = useAuth();

  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allKitchens, setAllKitchens] = useState<Kitchen[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allOperations, setAllOperations] = useState<OperationEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch data from API on auth change
  useEffect(() => {
    if (!isAuthenticated) {
      setAllOrgs([]);
      setAllUsers([]);
      setAllKitchens([]);
      setAllCategories([]);
      setAllProducts([]);
      setAllOperations([]);
      setLoading(false);
      return;
    }

    if (localStorage.getItem('km_org_suspended') === 'true') {
      setAllOrgs([]);
      setAllUsers([]);
      setAllKitchens([]);
      setAllCategories([]);
      setAllProducts([]);
      setAllOperations([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        const bigPage = { page_size: '1000' };

        if (userRole === 'SUPER_ADMIN' || userRole === 'TENANT_ADMIN') {
          const [orgsRes, usersRes] = await Promise.all([
            organizationsService.getAll(bigPage).catch(() => ({ data: { results: [] } })),
            usersService.getAll(bigPage).catch(() => ({ data: { results: [] } })),
          ]);
          if (controller.signal.aborted) return;
          const rawOrgs = orgsRes.data.results || orgsRes.data || [];
          setAllOrgs(rawOrgs.map(normalizeOrg));
          setAllUsers(usersRes.data.results || usersRes.data || []);
        }

        const [kitchensRes, categoriesRes, productsRes, operationsRes] = await Promise.all([
          kitchensService.getAll(bigPage).catch(() => ({ data: { results: [] } })),
          categoriesService.getAll(bigPage).catch(() => ({ data: { results: [] } })),
          productsService.getAll(bigPage).catch(() => ({ data: { results: [] } })),
          operationsService.getAll(bigPage).catch(() => ({ data: { results: [] } })),
        ]);

        if (controller.signal.aborted) return;
        setAllKitchens(kitchensRes.data.results || kitchensRes.data || []);
        setAllCategories(categoriesRes.data.results || categoriesRes.data || []);
        setAllProducts(productsRes.data.results || productsRes.data || []);
        const rawOps = operationsRes.data.results || operationsRes.data || [];
        setAllOperations(rawOps.map(normalizeOperation));
      } catch (err) {
        if (!controller.signal.aborted) console.error('Failed to fetch data:', err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [isAuthenticated, userRole, organizationId]);

  // --- DERIVED STATE ---
  const currentOrganization = useMemo(
    () => allOrgs.find(o => String(o.id) === String(organizationId)) || null,
    [allOrgs, organizationId]
  );

  const stats: DashboardStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      todayEntries: allOperations.filter(op => op.date === today).length,
      incomingKg: allOperations
        .filter(op => op.type === 'INCOMING' && op.unit === 'kg')
        .reduce((acc, curr) => acc + curr.quantity, 0),
      salesCount: allOperations.filter(op => op.type === 'SALE').length,
    };
  }, [allOperations]);

  const subscription = currentOrganization?.plan || 'BASIC';

  // --- ACTIONS ---

  const addOrganization = useCallback(async (data: Omit<Organization, 'id' | 'createdAt'>) => {
    try {
      const { data: newOrg } = await organizationsService.create(data as Record<string, unknown>);
      setAllOrgs(prev => [...prev, normalizeOrg(newOrg)]);
    } catch (err) {
      console.error('Failed to create organization:', err);
    }
  }, []);

  const updateOrganization = useCallback(async (id: string, updates: Partial<Organization>) => {
    try {
      const { data: updated } = await organizationsService.update(id, updates as Record<string, unknown>);
      setAllOrgs(prev => prev.map(o => String(o.id) === String(id) ? normalizeOrg(updated) : o));
    } catch (err) {
      console.error('Failed to update organization:', err);
    }
  }, []);

  const addUser = useCallback(async (data: Omit<User, 'id' | 'createdAt'>) => {
    try {
      const { data: newUser } = await usersService.create(data as Record<string, unknown>);
      setAllUsers(prev => [...prev, newUser]);
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  }, []);

  const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
    try {
      const { data: updated } = await usersService.update(id, updates as Record<string, unknown>);
      setAllUsers(prev => prev.map(u => String(u.id) === String(id) ? updated : u));
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    try {
      await usersService.delete(id);
      setAllUsers(prev => prev.filter(u => String(u.id) !== String(id)));
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  }, []);

  const upgradeSubscription = useCallback((_plan: SubscriptionPlan) => {
    window.location.href = '/settings';
  }, []);

  const addKitchen = useCallback(async (data: Omit<Kitchen, 'id' | 'createdAt' | 'organizationId'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: newKitchen } = await kitchensService.create(data as Record<string, unknown>);
      setAllKitchens(prev => [newKitchen, ...prev]);
      return { success: true };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      return { success: false, error: error.response?.data?.detail || 'Failed to create kitchen' };
    }
  }, []);

  const updateKitchen = useCallback(async (id: string, updates: Partial<Kitchen>) => {
    try {
      const { data: updated } = await kitchensService.update(id, updates as Record<string, unknown>);
      setAllKitchens(prev => prev.map(k => String(k.id) === String(id) ? updated : k));
    } catch (err) {
      console.error('Failed to update kitchen:', err);
    }
  }, []);

  const deleteKitchen = useCallback(async (id: string) => {
    try {
      await kitchensService.delete(id);
      setAllKitchens(prev => prev.filter(k => String(k.id) !== String(id)));
    } catch (err) {
      console.error('Failed to delete kitchen:', err);
    }
  }, []);

  const addCategory = useCallback(async (name: string) => {
    try {
      const { data: newCat } = await categoriesService.create({ name });
      setAllCategories(prev => [...prev, newCat]);
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  }, []);

  const updateCategory = useCallback(async (id: string, name: string) => {
    try {
      const { data: updated } = await categoriesService.update(id, { name });
      setAllCategories(prev => prev.map(c => String(c.id) === String(id) ? updated : c));
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await categoriesService.delete(id);
      setAllCategories(prev => prev.filter(c => String(c.id) !== String(id)));
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  }, []);

  const addProduct = useCallback(async (data: Omit<Product, 'id' | 'organizationId'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: newProduct } = await productsService.create(data as Record<string, unknown>);
      setAllProducts(prev => [newProduct, ...prev]);
      return { success: true };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string; code?: string[] } } };
      const msg = error.response?.data?.detail || error.response?.data?.code?.[0] || 'Failed to create product';
      return { success: false, error: msg };
    }
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: updated } = await productsService.update(id, updates as Record<string, unknown>);
      setAllProducts(prev => prev.map(p => String(p.id) === String(id) ? updated : p));
      return { success: true };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string; code?: string[] } } };
      const msg = error.response?.data?.detail || error.response?.data?.code?.[0] || 'Failed to update product';
      return { success: false, error: msg };
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await productsService.delete(id);
      setAllProducts(prev => prev.filter(p => String(p.id) !== String(id)));
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  }, []);

  const addOperation = useCallback(async (data: Omit<OperationEntry, 'id' | 'organizationId'>) => {
    try {
      const { data: newOp } = await operationsService.create(data as Record<string, unknown>);
      setAllOperations(prev => [normalizeOperation(newOp), ...prev]);
    } catch (err) {
      console.error('Failed to create operation:', err);
    }
  }, []);

  const updateOperation = useCallback(async (id: string, updates: Partial<OperationEntry>) => {
    try {
      const { data: updated } = await operationsService.update(id, updates as Record<string, unknown>);
      setAllOperations(prev => prev.map(op => String(op.id) === String(id) ? normalizeOperation(updated) : op));
    } catch (err) {
      console.error('Failed to update operation:', err);
    }
  }, []);

  const deleteOperation = useCallback(async (id: string) => {
    try {
      await operationsService.delete(id);
      setAllOperations(prev => prev.filter(op => String(op.id) !== String(id)));
    } catch (err) {
      console.error('Failed to delete operation:', err);
    }
  }, []);

  const fetchFilteredOperations = useCallback(async (params: Record<string, string>): Promise<OperationEntry[]> => {
    try {
      const res = await operationsService.getAll(params);
      const raw = res.data.results || res.data || [];
      return raw.map(normalizeOperation);
    } catch (err) {
      console.error('Failed to fetch filtered operations:', err);
      return [];
    }
  }, []);

  const value = useMemo(() => ({
    // SaaS
    organizations: allOrgs,
    addOrganization,
    updateOrganization,

    // Users
    users: allUsers,
    addUser,
    updateUser,
    deleteUser,

    // Tenant
    currentOrganization,
    kitchens: allKitchens,
    products: allProducts,
    categories: allCategories,
    operations: allOperations,
    stats,
    subscription,
    loading,

    upgradeSubscription,
    addKitchen,
    updateKitchen,
    deleteKitchen,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    addOperation,
    updateOperation,
    deleteOperation,
    fetchFilteredOperations,
  }), [
    allOrgs, addOrganization, updateOrganization,
    allUsers, addUser, updateUser, deleteUser,
    currentOrganization, allKitchens, allProducts, allCategories, allOperations,
    stats, subscription, loading,
    upgradeSubscription,
    addKitchen, updateKitchen, deleteKitchen,
    addProduct, updateProduct, deleteProduct,
    addCategory, updateCategory, deleteCategory,
    addOperation, updateOperation, deleteOperation,
    fetchFilteredOperations,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
