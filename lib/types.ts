/**
 * API Data Types
 *
 * These types match the byonesix API response structure.
 * Update these types if your backend API uses a different structure.
 */

export interface Translation {
  id: string;
  name: string | null;
  description?: string | null;
  language_id: string;
  surcharge_id?: number;
}

// export interface Addon {
//   id: string;
//   created_at: string;
//   updated_at: string;
//   name: string;
//   price: number;
//   image: string | null;
//   in_stock: boolean;
//   order: number | null;
//   location_id: number | string;
//   delivery_price_enabled: boolean;
//   price_delivery: number | null;
//   deposit_amount: number;
//   is_remove_item: boolean;
//   automatic_in_stock: boolean;
//   translations: Translation[];
// }

// export interface Product {
//   id: string;
//   name: string;
//   description: string | null;
//   image: string;
//   price: number;
//   in_stock: boolean;
//   product_category_id: string | null;
//   tax_rate: number;
//   location_id: string | number;
//   order: number | null;
//   featured: boolean;
//   print_kitchen_receipt: boolean;
//   discount_amount: number | null;
//   popular_order: number | null;
//   delivery_price_enabled: boolean;
//   price_delivery: number | null;
//   available_start: string | null;
//   available_end: string | null;
//   weight: number | null;
//   step_layout: boolean;
//   deposit_amount: number;
//   availability: string | null;
//   tax_rate_pickup: number | null;
//   tax_rate_delivery: number | null;
//   automatic_in_stock: boolean;
//   featured_checkout: boolean;
//   featured_checkout_order: number | null;
//   menu_primary_product_id: string | null;
//   visible_on_setup_types: string[];
//   suggested_products: any[];
//   sections: Section[];
//   upgrades: Upgrade[];
//   surcharges: Surcharge[];
//   translations: Translation[];
// }

// export interface SectionItem {
//   id: string;
//   name: string | null;
//   price: number;
//   in_stock: boolean;
//   order: number;
//   product_section_id: string;
//   delivery_price_enabled: boolean;
//   price_delivery: number | null;
//   weight: number | null;
//   default_selected: boolean;
//   real_name: string;
//   stock: boolean;
//   is_product: boolean;
//   is_addon: boolean;
//   deposit_amount: number;
//   product: Product | null;
//   addon: Addon | null;
//   translations: Translation[];
// }

// export interface Section {
//   id: string;
//   product_id: string;
//   order: number;
//   created_at: string;
//   updated_at: string;
//   name: string;
//   type: 'addons' | 'products';
//   max_quantity: number;
//   min_quantity: number;
//   deleted_at: string | null;
//   default_selected: boolean;
//   max_per_item: number;
//   external_sync_enabled: boolean;
//   optional: boolean;
//   select_count: number;
//   items: SectionItem[];
//   translations: Translation[];
// }

// export interface Surcharge {
//   id: string;
//   name: string;
//   description: string | null;
//   amount: number;
//   tax_rate: number;
//   is_revenue: boolean;
//   in_product_price: boolean;
//   identifier: string;
//   deleted_at: string | null;
//   location_id: number | string;
//   binding_id: string | null;
//   binding_default_variation_id: string | null;
//   order_types: string[];
//   pivot?: {
//     product_id: number | string;
//     surcharge_id: number | string;
//   };
//   translations?: Translation[];
// }

// export interface Upgrade {
//   id: string;
//   product_id: string;
//   target_product_id: string;
//   order: number;
//   identifier: string;
// }

// export interface MenuCategory {
//   id: string;
//   name: string;
//   description: string;
//   created_at: string;
//   updated_at: string;
//   order: number;
//   image: string;
//   tax_rate: number;
//   flows: any[];
//   products: Product[];
//   translations: Translation[];
//   location_id?: number | string;
//   matching_category_id?: string | null;
//   identifier?: string;
//   columns?: number;
//   deleted_at?: string | null;
// }

// export interface SiteData {
//   last_updated: string;
//   version: number;
//   menu: MenuCategory[];
//   featured_checkout: MenuCategory[];
// }

// export interface Availability {
//   day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
//   available: boolean | string;
// }

// export interface RestaurantInfo {
//   name: string;
//   logo: string;
//   address: string;
//   city: string;
//   postalCode: string;
//   openUntil: string;
//   flag: string;
//   mapsUrl: string;
// }

export interface IStoreInfo {
  /** The firm name, joined from the admin's user record — not the store row. */
  brandName: string;
  storeName: string;
  /**
   * Declaring a field here is not enough to make it available: `getStoreData`
   * maps the response through an allow-list, so anything added below must be
   * added there too or it arrives undefined.
   */
  /** Branch name on the store record — "Dach der Liebe", not the firm. */
  name?: string;
  /** Free text the admin panel labels "About". */
  about?: string | null;
  /** Set in the admin panel's Base Data tab; renders under the name. */
  cuisineTags?: string[] | null;
  priceLevel?: string | null;
  website?: string | null;
  mobileNumber?: string | null;
  /** Store-wide ETA, used when no postal-code rate applies. */
  deliveryTime?: number | null;
  address: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  slug: string;
  logo: string | null;
  /** Wide photograph behind the menu hero. Not served by the API yet. */
  coverImage: string | null;
  timings: {
    monday: { open: string; close: string };
    tuesday: { open: string; close: string };
    wednesday: { open: string; close: string };
    thursday: { open: string; close: string };
    friday: { open: string; close: string };
    saturday: { open: string; close: string };
    sunday: { open: string; close: string };
  } | null;
  settings: {
    logo: string | null;
    themeColors: {
      primaryColor: string;
      selectedTextColor: string;
    };
    paymentMethods: { cash: boolean; ecCardReader: boolean };
    orderTypes: { dineIn: boolean; takeaway: boolean; delivery: boolean };
  } | null;
  coordinates: { latitude: number; longitude: number } | null;
  adminGoogleApiKey: string;
  posGoogleApiKey: string;
  postalRates: {
    postalCode: number;
    deliveryCharges: number;
    minimumOrderAmount: number;
    deliveryTime: number;
    priorityDeliveryTime: number;
    priorityDeliveryCharges?: number;
    _id: string;
  }[];
  storeId: string;
  adminId: string;
  tableInfo: {
    token: string;
    areaId: string;
    areaName: string;
    tableId: number;
    tableNumber: number;
  };
}
