export enum PermissionKey {
    PRODUCT_VIEW = 'PRODUCT_VIEW',
    PRODUCT_CREATE = 'PRODUCT_CREATE',
    PRODUCT_UPDATE = 'PRODUCT_UPDATE',
    PRODUCT_DELETE = 'PRODUCT_DELETE',

    CATEGORY_MANAGE = 'CATEGORY_MANAGE',

    BRAND_MANAGE = 'BRAND_MANAGE',

    ORDER_VIEW = 'ORDER_VIEW',
    ORDER_UPDATE_STATUS = 'ORDER_UPDATE_STATUS',
    ORDER_CANCEL = 'ORDER_CANCEL',
    ORDER_EXPORT = 'ORDER_EXPORT',

    PROMOTION_MANAGE = 'PROMOTION_MANAGE',

    CONTENT_MANAGE = 'CONTENT_MANAGE',

    CUSTOMER_VIEW = 'CUSTOMER_VIEW',
    CUSTOMER_BAN = 'CUSTOMER_BAN',

    STAFF_MANAGE = 'STAFF_MANAGE',
    ROLE_MANAGE = 'ROLE_MANAGE',

    REPORT_VIEW_REVENUE = 'REPORT_VIEW_REVENUE',
    REPORT_VIEW_GENERAL = 'REPORT_VIEW_GENERAL',
}

// Define interface for seeding data matching the Prisma Schema
interface PermissionMetadata {
    name: PermissionKey;
    resource: string;
    action: string;
    description?: string;
}

export const PERMISSIONS_METADATA: PermissionMetadata[] = [
    // Product
    { name: PermissionKey.PRODUCT_VIEW, resource: 'PRODUCT', action: 'VIEW' },
    { name: PermissionKey.PRODUCT_CREATE, resource: 'PRODUCT', action: 'CREATE' },
    { name: PermissionKey.PRODUCT_UPDATE, resource: 'PRODUCT', action: 'UPDATE' },
    { name: PermissionKey.PRODUCT_DELETE, resource: 'PRODUCT', action: 'DELETE' },

    // Category & Brand
    { name: PermissionKey.CATEGORY_MANAGE, resource: 'CATEGORY', action: 'MANAGE' },
    { name: PermissionKey.BRAND_MANAGE, resource: 'BRAND', action: 'MANAGE' },

    // Order
    { name: PermissionKey.ORDER_VIEW, resource: 'ORDER', action: 'VIEW' },
    { name: PermissionKey.ORDER_UPDATE_STATUS, resource: 'ORDER', action: 'UPDATE_STATUS' },
    { name: PermissionKey.ORDER_CANCEL, resource: 'ORDER', action: 'CANCEL' },
    { name: PermissionKey.ORDER_EXPORT, resource: 'ORDER', action: 'EXPORT' },

    // Marketing
    { name: PermissionKey.PROMOTION_MANAGE, resource: 'PROMOTION', action: 'MANAGE' },
    { name: PermissionKey.CONTENT_MANAGE, resource: 'CONTENT', action: 'MANAGE' },

    // Customer
    { name: PermissionKey.CUSTOMER_VIEW, resource: 'CUSTOMER', action: 'VIEW' },
    { name: PermissionKey.CUSTOMER_BAN, resource: 'CUSTOMER', action: 'BAN' },

    // System
    { name: PermissionKey.STAFF_MANAGE, resource: 'SYSTEM', action: 'MANAGE_STAFF' },
    { name: PermissionKey.ROLE_MANAGE, resource: 'SYSTEM', action: 'MANAGE_ROLE' },

    // Report
    { name: PermissionKey.REPORT_VIEW_REVENUE, resource: 'REPORT', action: 'VIEW_REVENUE' },
    { name: PermissionKey.REPORT_VIEW_GENERAL, resource: 'REPORT', action: 'VIEW_GENERAL' },
];
