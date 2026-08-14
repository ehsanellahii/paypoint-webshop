export type Language = 'en' | 'de';

export interface Translations {
  openUntil: string;
  location: string;

  popular: string;
  truffleSeason: string;
  lunchDeals: string;
  fentimans: string;
  burgers: string;
  sides: string;
  sandwiches: string;
  sauces: string;
  wine: string;
  beer: string;
  softDrinks: string;
  milkshakes: string;
  kids: string;

  yourCart: string;
  checkout: string;
  closed: string;
  total: string;
  totalIncludingVAT: string;
  proceedToCheckout: string;
  placeOrder: string;
  placingOrder: string;
  paymentMethod: string;
  enterDetails: string;
  order: string;
  close: string;
  next: string;
  back: string;
  pay: string;
  cash: string;
  posCardPayment: string;

  specialInstructions: string;
  addAnySpecialRequests: string;
  addToCart: string;

  yourName: string;
  name: string;
  email: string;
  phoneNumber: string;
  pickupTime: string;
  asapTime: string;
  tableNumber: string;
  yourData: string;
  checkTableNumber: string;
  nameRequired: string;
  emailRequired: string;
  invalidEmail: string;
  phoneRequired: string;
  invalidPhone: string;
  tableRequired: string;

  notAvailable: string;
  chooseYourSize: string;
  addExtras: string;
  regular: string;
  large: string;
  extraBacon: string;
  extraCheese: string;
  extraPickles: string;
  pickup: string;
  delivery: string;
  dineIn: string;
  googleMapNotLoadedError: string;
  typeMoreDetailsError: string;
  addMoreAddressDetails: string;
  deliveryAddress: string;
  loadingMaps: string;
  pleaseWait: string;
  startTypeAndChooseAddress: string;
  searching: string;
  noSuggestionsFoundAddPostalCode: string;
  cancel: string;
  couldNotFetchAddressDetails: string;
  addressSearchPlaceholder: string;
  houseStreetNumber: string;
  streetName: string;
  postalCode: string;
  pleaseSelectCompleteAddress: string;
  deliverTo: string;
  deliveryCharges: string;
  weAreNotAvailableInYourArea: string;
  minimumOrderAmountIs: string;
  requiredChooseAtleast: string;
  chooseMin: string;
  chooseUpTo: string;
  maxReached: string;
  add: string;
  selected: string;
  deliveryNotes: string;
  enterDeliveryNotes: string;
  deliveryTime: string;
  orderPlacedSuccessfully: string;
  orderId: string;
  redirectingIn: string;
  continue: string;
  termAndConditions: string;
  privacyPolicy: string;

  orders: string;
  items: string;
  itemsTotal: string;
  discount: string;
  tax: string;
  customer: string;
  address: string;
  vouchers: string;
  totalOrders: string;

  pleaseLogin: string;
  loginToSeeOrders: string;
  loading: string;
  somethingWentWrong: string;
  retry: string;
  searchMenu: string;
  restaurantDetails: string;
  preorder: string;
  noResults: string;
  noResultsFor: string;
  resetSearch: string;
  minimumOrderValue: string;
  free: string;
  /** Distinct from `free` — that one also labels zero-cost product options. */
  freeDelivery: string;
  socialNoEmail: string;
  aboutRestaurant: string;
  website: string;
  /* Diagnostic markers: shown in place of data the backend does not supply. */
  notProvided: string;
  fieldDescription: string;
  fieldCuisine: string;
  fieldRating: string;
  fieldDeliveryTime: string;
  fieldMinimumOrder: string;
  fieldOpeningHours: string;
  fieldAddress: string;
  fieldPhone: string;
  fieldLogo: string;
  optional: string;
  required: string;
  added: string;
  recommendedForYou: string;
  messageForRestaurant: string;
  messageForRestaurantPlaceholder: string;
  messageForRestaurantHint: string;
  goToCheckout: string;
  loginWelcome: string;
  loginSub: string;
  continueAsGuest: string;
  orDivider: string;
  legalNoticePrefix: string;
  legalNoticeAnd: string;
  otpTitle: string;
  otpHeroTitle: string;
  otpHeroSub: string;
  confirm: string;
  otpSentTo: string;
  resendOtp: string;
  active: string;
  pastOrders: string;
  paymentCards: string;
  paymentOtherMethods: string;
  addNewCard: string;
  onlinePayment: string;
  invoiceOrInstalments: string;
  statusAccepted: string;
  isPreparingYourOrder: string;
  skipToContent: string;
  voucherActivated: string;
  saved: string;
  menuLoadFailed: string;
  menuLoadFailedSub: string;
  reload: string;
  cartEmpty: string;
  cartEmptySub: string;
  addMoreItems: string;
  save: string;
  edit: string;
  tip: string;
  noTip: string;
  tipToDriver: string;
  tipToTeam: string;
  tipThanksDriver: string;
  tipThanksTeam: string;
  onDelivery: string;
  onPickup: string;
  bellName: string;
  bellNameRequired: string;
  deliverySpeedLabel: string;
  standard: string;
  priority: string;
  zoneHeroTitle: string;
  zoneFeature1: string;
  zoneFeature2: string;
  zoneFeature3: string;
  deliveryAndPickup: string;
  doWeDeliver: string;
  doWeDeliverSub: string;
  streetHouseAndPostcode: string;
  useCurrentLocation: string;
  checkDeliveryArea: string;
  bellNameRequiredField: string;
  callbackNumber: string;
  phoneForQuestions: string;
  redeem: string;
  or: string;
  yourSavedDishes: string;
  orderedItems: string;
  productInfo: string;
  addMore: string;
  paymentMethodsSummary: string;
  redeemCode: string;
  enterPromoCode: string;
  chooseDeliveryTime: string;
  soldOut: string;
  saveOnYourOrder: string;
  enterCodeOrPickOffer: string;
  voucherCode: string;
  applied: string;
  voucherActive: string;
  availableOffers: string;
  payNow: string;
  paymentFailed: string;
  paymentType: string;
  callbackNumberShort: string;
  driverInstructions: string;
  addressLookupUnavailable: string;
  addressLookupUnavailableSub: string;
  weDeliverToYou: string;
  deliveryTimeApprox: string;
  from: string;
  continueToMenu: string;
  outsideDeliveryArea: string;
  outsideDeliveryAreaSub: string;
  checkAnotherAddress: string;
  callUs: string;
  switchToPickupBrowse: string;
  switchToPickup: string;
  addNewAddress: string;
  addressBookSub: string;
  saveAs: string;
  labelHome: string;
  labelWork: string;
  labelOther: string;
  chooseFromSuggestions: string;
  saveAddress: string;
  deleteAddress: string;
  exploreShopAnyway: string;
  orderConfirmed: string;
  orderConfirmedDeliverySub: string;
  orderConfirmedPickupSub: string;
  inProgress: string;
  estimatedDelivery: string;
  readyForPickup: string;
  preparation: string;
  onTheWay: string;
  delivered: string;
  ready: string;
  pickedUp: string;
  courierBeingAssigned: string;
  courierBeingAssignedSub: string;
  orderNumber: string;
  pickupAt: string;
  payment: string;
  problemWithOrder: string;
  helpAndSupport: string;
  yourOrder: string;
  backToHome: string;
  guest: string;
  welcomeBack: string;
  myAccount: string;
  orderingAsGuest: string;
  orderingAsGuestSub: string;
  help: string;
  contactSupport: string;
  changeLanguage: string;
  legal: string;
  my: string;
  quickAccess: string;
  myCart: string;
  logoutConfirm: string;
  privacy: string;
  terms: string;
  imprint: string;
  account: string;
  invite: string;
  inviteTitle: string;
  inviteSub: string;
  copy: string;
  copied: string;
  noReferralCode: string;
  cartItemsRemoved: string;
  checkoutTitle: string;
  completeOrder: string;
  orderSummary: string;
  subtotal: string;
  stillMissing: string;
  pleaseComplete: string;
  loginFailed: string;
  choosePaymentMethod: string;
  addVoucher: string;
  redeemCodeAndSave: string;
  preorderPlanLater: string;
  emailUs: string;
  directions: string;
  supportHours: string;
  orderDetails: string;
  deliveredTo: string;
  viewOrder: string;
  reorder: string;
  status: string;
  day: string;
  time: string;
  today: string;
  tomorrow: string;
  confirmPreorder: string;
  preorderSubDelivery: string;
  preorderSubPickup: string;
  openingHours: string;
  addressContact: string;
  noOrdersYet: string;
  yourOrdersWillAppearHere: string;
  notLoggedIn: string;
  enterOtp: string;
  otpSendFailed: string;
  sendOtp: string;
  invalidOtp: string;
  otpExpired: string;
  verify: string;
  otpVerifyFailed: string;
  otpSessionExpired: string;

  sentToStore: string;
  inDelivery: string;
  isDelivered: string;
  isCancelled: string;
  enterVoucherCode: string;
  apply: string;
  remove: string;
  voucher: string;
  voucherApplyFailed: string;
  VOUCHER_NOT_FOUND: string;
  LIMIT_EXCEEDED: string;
  MINIMUM_ORDER_VALUE_NOT_MET: string;
  CUSTOMER_NOT_FOUND: string;
  phoneHelper?: string;
  login: string;
  logout?: string;
  profile: string;
  points: string;

  noFavoriteItemsYet: string;
  totalFavItems: string;
  favorites: string;
  savedItemsForRestaurant: string;
  clear: string;
  hey: string;
  favoriteProducts: string;
  register: string;
  loginToSeeProfileAndFavorites: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    openUntil: 'Open until',
    location: 'Route',
    delivery: 'Delivery',
    pickup: 'Pickup',
    dineIn: 'Dine In',
    popular: 'Popular',
    truffleSeason: 'Truffle Season',
    lunchDeals: 'LunchDeals',
    fentimans: 'Fentimans',
    burgers: 'Burgers',
    sides: 'Sides',
    sandwiches: 'Sandwiches',
    sauces: 'Sauces',
    wine: 'Wine',
    beer: 'Beer',
    softDrinks: 'Soft Drinks',
    milkshakes: 'Milkshakes',
    kids: 'Kids',

    yourCart: 'Your Cart',
    checkout: 'Order',
    closed: 'Closed',
    total: 'Total',
    totalIncludingVAT: 'Total (Including VAT)',
    proceedToCheckout: 'Proceed to Checkout',
    placeOrder: 'Place Order',
    placingOrder: 'Placing Order...',
    paymentMethod: 'Payment Method',
    enterDetails: 'Enter your details',
    order: 'Order',
    close: 'Close',
    next: 'Next',
    back: 'Back',
    pay: 'Pay',
    cash: 'Cash',
    posCardPayment: 'Card Payment',

    // specialInstructions: 'Special Instructions (Optional)',
    addAnySpecialRequests: 'Add any special requests...',
    addToCart: 'Add to Cart',

    yourName: 'Your Name',
    name: 'Name',
    email: 'Email',
    phoneNumber: 'Phone number',
    pickupTime: 'Pickup time',
    asapTime: 'As soon as possible',
    tableNumber: 'Table Number',
    yourData: 'Your data',
    checkTableNumber: 'Check the number written on your table',
    nameRequired: 'Name is required',
    emailRequired: 'Email is required',
    invalidEmail: 'Invalid email address',
    phoneRequired: 'Phone number is required',
    invalidPhone: 'Invalid phone number',
    tableRequired: 'Table number is required',

    notAvailable: 'Not Available',
    chooseYourSize: 'Choose your size',
    addExtras: 'Add extras',
    regular: 'Regular',
    large: 'Large',
    extraBacon: 'Extra Bacon',
    extraCheese: 'Extra Cheese',
    extraPickles: 'Extra Pickles',

    googleMapNotLoadedError: 'Google Maps is not loaded. Please try again.',
    typeMoreDetailsError: 'Type more details (street, number, postal code) for best results.',
    addMoreAddressDetails: 'Street + house number + postal code',
    deliveryAddress: 'Delivery address',
    loadingMaps: 'Loading Maps…',
    pleaseWait: 'Please wait',
    startTypeAndChooseAddress: 'Start typing and choose your address from the list.',
    searching: 'Searching…',
    noSuggestionsFoundAddPostalCode: 'No suggestions found. Try adding a postal code.',
    cancel: 'Cancel',
    couldNotFetchAddressDetails: 'Could not fetch address details. Please try another suggestion.',
    addressSearchPlaceholder: 'Street + house number + postal code',
    pleaseSelectCompleteAddress: 'Please select a complete address that includes:',
    houseStreetNumber: 'House / street number',
    streetName: 'Street name',
    postalCode: 'Postal code',
    deliverTo: 'Deliver to',
    deliveryCharges: 'Delivery Charges',
    weAreNotAvailableInYourArea: 'We are not available in your area.',
    specialInstructions: 'Special Instructions / Notes (Optional)',
    minimumOrderAmountIs: 'Minimum order amount is',
    requiredChooseAtleast: 'Required: Choose at least',
    chooseMin: 'Choose min',
    chooseUpTo: 'Choose up to',
    maxReached: 'Max reached',
    add: 'Add',
    selected: 'selected',
    deliveryNotes: 'Delivery Notes',
    enterDeliveryNotes: 'Enter delivery notes...',
    deliveryTime: 'Delivery Time',

    orderPlacedSuccessfully: 'Order placed successfully 🎉',
    orderId: 'Order ID',
    redirectingIn: 'Redirecting in',
    continue: 'Continue now',
    termAndConditions: 'Terms and Conditions',
    privacyPolicy: 'Privacy Policy',

    orders: 'Orders',
    items: 'items',
    itemsTotal: 'Items total',
    discount: 'Discount',
    tax: 'Tax',
    customer: 'Customer',
    address: 'Address',
    vouchers: 'Vouchers',
    totalOrders: 'Total orders',

    pleaseLogin: 'Please login',
    loginToSeeOrders: 'Login to see your order history.',
    loading: 'Loading...',
    somethingWentWrong: 'Something went wrong',
    retry: 'Retry',
    searchMenu: 'Search the menu — pizza, burgers, pasta…',
    restaurantDetails: 'Restaurant details',
    preorder: 'Pre-order',
    noResults: 'Nothing found',
    noResultsFor: 'No dish found for',
    resetSearch: 'Reset search',
    minimumOrderValue: 'Min. order',
    free: 'Free',
    freeDelivery: 'Free delivery',
    socialNoEmail: 'This account did not share an email address. Please sign in with your phone number instead.',
    aboutRestaurant: 'About us',
    website: 'Website',
    notProvided: 'not provided',
    fieldDescription: 'Description',
    fieldCuisine: 'Cuisine tags',
    fieldRating: 'Rating',
    fieldDeliveryTime: 'Delivery time',
    fieldMinimumOrder: 'Minimum order',
    fieldOpeningHours: 'Opening hours',
    fieldAddress: 'Address',
    fieldPhone: 'Phone',
    fieldLogo: 'Logo',
    optional: 'optional',
    required: 'Required',
    added: 'Added',
    recommendedForYou: 'Recommended for you',
    messageForRestaurant: 'Message for the restaurant',
    messageForRestaurantPlaceholder: 'Special requests, allergies, dietary restrictions or a gift-card message …',
    messageForRestaurantHint: 'Special requests, allergies or a gift note',
    goToCheckout: 'Go to checkout',
    loginWelcome: 'Welcome to',
    loginSub: 'Sign in to order — or check out as a guest.',
    continueAsGuest: 'Order as a guest',
    orDivider: 'or',
    legalNoticePrefix: 'By signing in you accept our',
    legalNoticeAnd: 'and',
    otpTitle: 'Confirmation code',
    otpHeroTitle: 'One step away from your order.',
    otpHeroSub: 'We sent you a code by SMS. Enter it here to continue.',
    confirm: 'Confirm',
    otpSentTo: 'Sent to',
    resendOtp: 'Send the code again',
    active: 'Active',
    pastOrders: 'Past orders',
    paymentCards: 'Credit cards',
    paymentOtherMethods: 'Other payment methods',
    addNewCard: 'Add a new card',
    onlinePayment: 'Online payment',
    invoiceOrInstalments: 'Invoice or instalments',
    statusAccepted: 'Accepted',
    isPreparingYourOrder: 'is preparing your order',
    skipToContent: 'Skip to content',
    voucherActivated: 'Voucher activated!',
    saved: 'saved',
    menuLoadFailed: 'The menu could not be loaded',
    menuLoadFailedSub: 'You are seeing only part of it. Please reload the page.',
    reload: 'Reload',
    cartEmpty: 'Your cart is empty',
    cartEmptySub: 'Add a dish to get to checkout.',
    addMoreItems: 'Add more items',
    save: 'Save',
    edit: 'Edit',
    tip: 'Tip',
    noTip: 'None',
    tipToDriver: '100% to the driver',
    tipToTeam: '100% to the team',
    tipThanksDriver: 'Thank you! Your driver receives 100% of the tip.',
    tipThanksTeam: 'Thank you! The team receives 100% of the tip.',
    onDelivery: 'On delivery',
    onPickup: 'On pickup',
    bellName: 'Bell name',
    bellNameRequired: 'Please enter a bell name',
    deliverySpeedLabel: 'Delivery time',
    standard: 'Standard',
    priority: 'Priority',
    zoneHeroTitle: 'Real cuisine, fresh to your door.',
    zoneFeature1: 'Delivered in 20–40 min',
    zoneFeature2: 'Fresh ingredients, daily',
    zoneFeature3: '4.8 ★ · 820+ reviews',
    deliveryAndPickup: 'Delivery & pickup',
    doWeDeliver: 'Do we deliver to you?',
    doWeDeliverSub: 'Enter your address — we’ll instantly check if you’re in our delivery area.',
    streetHouseAndPostcode: 'Street, house no. & postcode',
    useCurrentLocation: 'Use current location',
    checkDeliveryArea: 'Check delivery area',
    bellNameRequiredField: 'Name on doorbell (required)',
    callbackNumber: 'Callback number (required)',
    phoneForQuestions: 'Phone number for questions (required)',
    redeem: 'Redeem',
    or: 'or',
    yourSavedDishes: 'Your saved dishes',
    orderedItems: 'Ordered items',
    productInfo: 'Product info',
    addMore: 'Add more',
    paymentMethodsSummary: 'Cash, card, PayPal or Klarna',
    redeemCode: 'Redeem a code',
    enterPromoCode: 'Enter a discount or promo code',
    chooseDeliveryTime: 'Choose a delivery time',
    soldOut: 'Fully booked',
    saveOnYourOrder: 'Save on your order',
    enterCodeOrPickOffer: 'Enter a code or pick an offer',
    voucherCode: 'VOUCHER CODE',
    applied: 'Applied',
    voucherActive: 'ACTIVE',
    availableOffers: 'Available offers',
    payNow: 'Pay now',
    paymentFailed: 'Payment failed',
    paymentType: 'Payment type',
    callbackNumberShort: 'Callback number',
    driverInstructions: 'Instructions for the driver (e.g. back door, 3rd floor)',
    addressLookupUnavailable: 'Address search is unavailable',
    addressLookupUnavailableSub: 'We can’t check your postcode automatically right now. Choose pickup, or call us and we’ll check for you.',
    weDeliverToYou: 'Yay, we deliver to you!',
    deliveryTimeApprox: 'Delivery approx. 20–40 min',
    from: 'from',
    continueToMenu: 'Continue to menu',
    outsideDeliveryArea: 'Unfortunately outside our area',
    outsideDeliveryAreaSub: 'This address is outside our delivery area.',
    checkAnotherAddress: 'Check another address',
    callUs: 'Call',
    switchToPickupBrowse: 'Switch to pickup & browse',
    switchToPickup: 'Switch to pickup',
    addNewAddress: 'Add a new address',
    addressBookSub: 'Pick a saved address or add a new one.',
    saveAs: 'Save as',
    labelHome: 'Home',
    labelWork: 'Work',
    labelOther: 'Other',
    chooseFromSuggestions: 'Please pick an address from the suggestions',
    saveAddress: 'Save address',
    deleteAddress: 'Delete address',
    exploreShopAnyway: 'Explore the shop anyway',
    orderConfirmed: 'Order confirmed',
    orderConfirmedDeliverySub: 'The kitchen is preparing your food.',
    orderConfirmedPickupSub: 'The kitchen is preparing your food.',
    inProgress: 'In progress',
    estimatedDelivery: 'Estimated delivery',
    readyForPickup: 'Ready for pickup',
    preparation: 'Preparation',
    onTheWay: 'On the way',
    delivered: 'Delivered',
    ready: 'Ready',
    pickedUp: 'Picked up',
    courierBeingAssigned: 'Courier being assigned',
    courierBeingAssignedSub: 'You’ll be notified once someone is on the way',
    orderNumber: 'Order number',
    pickupAt: 'Pickup at',
    payment: 'Payment',
    problemWithOrder: 'Problem with your order?',
    helpAndSupport: 'Help & support',
    yourOrder: 'Your order',
    backToHome: 'Back to home',
    guest: 'Guest',
    welcomeBack: 'Welcome back',
    myAccount: 'My account',
    orderingAsGuest: 'You’re ordering as a guest',
    orderingAsGuestSub: 'Sign in for favorites, order history & rewards.',
    help: 'Help',
    contactSupport: 'Contact support',
    changeLanguage: 'Change language',
    legal: 'Legal',
    my: 'My',
    quickAccess: 'Quick access',
    myCart: 'My cart',
    logoutConfirm: 'Are you sure you want to log out?',
    privacy: 'Privacy',
    terms: 'Terms',
    imprint: 'Imprint',
    account: 'Account',
    invite: 'Invite',
    inviteTitle: '€5 for you, €5 for your friends',
    inviteSub: 'Share your code. On your friend’s first order you both get €5.',
    copy: 'Copy',
    copied: 'Copied!',
    noReferralCode: 'No referral code available for your account yet.',
    cartItemsRemoved: 'Some items are no longer available and were removed from your cart.',
    checkoutTitle: 'Checkout',
    completeOrder: 'Complete your order',
    orderSummary: 'Order summary',
    subtotal: 'Subtotal',
    stillMissing: 'Still missing',
    pleaseComplete: 'Please complete',
    loginFailed: 'Login failed',
    choosePaymentMethod: 'Choose a payment method',
    addVoucher: 'Add a voucher',
    redeemCodeAndSave: 'Redeem a code and save',
    preorderPlanLater: 'Plan for later',
    emailUs: 'Email',
    directions: 'Directions',
    supportHours: 'We’re here for you daily 10 AM – 11 PM',
    orderDetails: 'Order details',
    deliveredTo: 'Delivered to',
    viewOrder: 'View order',
    reorder: 'Reorder',
    status: 'Status',
    day: 'Day',
    time: 'Time',
    today: 'Today',
    tomorrow: 'Tomorrow',
    confirmPreorder: 'Confirm pre-order',
    preorderSubDelivery: 'Choose the day and time of your delivery',
    preorderSubPickup: 'Choose the day and time of your pickup',
    openingHours: 'Opening hours',
    addressContact: 'Address & contact',
    noOrdersYet: 'No orders yet',
    yourOrdersWillAppearHere: 'Your recent orders will appear here.',
    notLoggedIn: 'Not logged in',

    sentToStore: 'Sent to store',
    inDelivery: 'In delivery',
    isDelivered: 'Delivered',
    isCancelled: 'Cancelled',
    enterVoucherCode: 'Enter voucher code',
    apply: 'Apply',
    remove: 'Remove',
    voucher: 'Voucher',
    voucherApplyFailed: 'Voucher apply failed',
    phoneHelper: 'Include your mobile number without leading 0',
    login: 'Login',
    logout: 'Logout',
    enterOtp: 'Enter OTP code',
    otpSendFailed: 'Failed to send OTP. Please try again.',
    sendOtp: 'Send OTP',
    invalidOtp: 'Invalid OTP. Please try again.',
    otpExpired: 'OTP has expired. Please request a new one.',
    verify: 'Verify',
    otpVerifyFailed: 'Failed to verify OTP. Please try again.',
    otpSessionExpired: 'OTP session expired. Please resend OTP.',
    profile: 'Profile',
    points: 'Points',
    noFavoriteItemsYet: 'No favorite items yet.',
    totalFavItems: 'Total Favorite Items',
    favorites: 'Favorites',
    savedItemsForRestaurant: 'Saved items for this restaurant',
    clear: 'Clear',
    hey: 'Hey',
    favoriteProducts: 'Favorite Products',
    register: 'Register',
    loginToSeeProfileAndFavorites: 'Login to view profile and favorites.',

    VOUCHER_NOT_FOUND: 'The voucher code you entered does not exist. Please check the code and try again.',
    LIMIT_EXCEEDED: 'You have exceeded the usage limit for this voucher. Please check the voucher terms and conditions.',
    MINIMUM_ORDER_VALUE_NOT_MET: 'Your order does not meet the minimum value required to apply this voucher. Please add more items to your cart.',
    CUSTOMER_NOT_FOUND: 'The customer associated with this voucher could not be found. Please ensure you are logged in with the correct account.',
  },
  de: {
    openUntil: 'Geöffnet bis',
    closed: 'Geschlossen',
    location: 'Standort',
    delivery: 'Lieferung',
    pickup: 'Abholung',
    dineIn: 'Vor Ort essen',
    popular: 'Beliebt',
    truffleSeason: 'Trüffelsaison',
    lunchDeals: 'Mittagsangebote',
    fentimans: 'Fentimans',
    burgers: 'Burger',
    sides: 'Beilagen',
    sandwiches: 'Sandwiches',
    sauces: 'Saucen',
    wine: 'Wein',
    beer: 'Bier',
    softDrinks: 'Erfrischungsgetränke',
    milkshakes: 'Milchshakes',
    kids: 'Kinder',

    yourCart: 'Ihr Warenkorb',
    checkout: 'Bestellen',
    total: 'Gesamt',
    totalIncludingVAT: 'Gesamt (inkl. MwSt.)',
    proceedToCheckout: 'Zur Kasse gehen',
    placeOrder: 'Bestellung aufgeben',
    placingOrder: 'Bestellung wird aufgegeben...',
    paymentMethod: 'Zahlungsmethode',
    enterDetails: 'Geben Sie Ihre Daten ein',
    order: 'Bestellung',
    close: 'Schließen',
    next: 'Weiter',
    back: 'Zurück',
    pay: 'Bezahlen',
    cash: 'Bargeld',
    posCardPayment: 'Kartenzahlung',

    // specialInstructions: 'Spezielle Anweisungen (Optional)',
    addAnySpecialRequests: 'Fügen Sie spezielle Wünsche hinzu...',
    addToCart: 'In den Warenkorb',

    yourName: 'Ihr Name',
    name: 'Name',
    email: 'E-Mail',
    phoneNumber: 'Telefonnummer',
    pickupTime: 'Abholzeit',
    asapTime: 'So schnell wie möglich',
    tableNumber: 'Tischnummer',
    yourData: 'Ihre Daten',
    checkTableNumber: 'Überprüfen Sie die Nummer auf Ihrem Tisch',
    nameRequired: 'Name ist erforderlich',
    emailRequired: 'E-Mail ist erforderlich',
    invalidEmail: 'Ungültige E-Mail-Adresse',
    phoneRequired: 'Telefonnummer ist erforderlich',
    invalidPhone: 'Ungültige Telefonnummer',
    tableRequired: 'Tischnummer ist erforderlich',

    notAvailable: 'Nicht verfügbar',
    chooseYourSize: 'Wählen Sie Ihre Größe',
    addExtras: 'Extras hinzufügen',
    regular: 'Normal',
    large: 'Groß',
    extraBacon: 'Extra Speck',
    extraCheese: 'Extra Käse',
    extraPickles: 'Extra Essiggurken',
    googleMapNotLoadedError: 'Google Maps ist nicht geladen. Bitte versuchen Sie es erneut.',
    typeMoreDetailsError: 'Geben Sie mehr Details ein (Straße, Hausnummer, PLZ) für bessere Ergebnisse.',
    addMoreAddressDetails: 'Straße + Hausnummer + PLZ',
    deliveryAddress: 'Lieferadresse',
    loadingMaps: 'Karten werden geladen…',
    pleaseWait: 'Bitte warten',
    startTypeAndChooseAddress: 'Beginnen Sie zu tippen und wählen Sie Ihre Adresse aus der Liste.',
    searching: 'Suche…',
    noSuggestionsFoundAddPostalCode: 'Keine Vorschläge gefunden. Versuchen Sie, eine PLZ hinzuzufügen.',
    cancel: 'Abbrechen',
    couldNotFetchAddressDetails: 'Adressdetails konnten nicht geladen werden. Bitte wählen Sie einen anderen Vorschlag.',
    addressSearchPlaceholder: 'Straße + Hausnummer + PLZ',
    pleaseSelectCompleteAddress: 'Bitte wählen Sie eine vollständige Adresse, die Folgendes enthält:',
    houseStreetNumber: 'Haus- / Straßennummer',
    streetName: 'Straßenname',
    postalCode: 'Postleitzahl',
    deliverTo: 'Liefern an',
    deliveryCharges: 'Lieferkosten',
    weAreNotAvailableInYourArea: 'Wir sind in Ihrer Gegend nicht verfügbar.',

    specialInstructions: 'Spezielle Anweisungen / Notizen (Optional)',
    minimumOrderAmountIs: 'Mindestbestellwert ist',
    requiredChooseAtleast: 'Erforderlich: Wählen Sie mindestens',
    chooseMin: 'Wählen Sie mindestens',
    chooseUpTo: 'Wählen Sie bis zu',
    maxReached: 'Maximal erreicht',
    add: 'Hinzufügen',
    selected: 'ausgewählt',
    deliveryNotes: 'Lieferhinweise',
    enterDeliveryNotes: 'Lieferhinweise eingeben...',
    deliveryTime: 'Lieferzeit',

    orderPlacedSuccessfully: 'Bestellung erfolgreich aufgegeben 🎉',
    orderId: 'Bestellnummer',
    redirectingIn: 'Weiterleitung in',
    continue: 'Jetzt fortfahren',
    termAndConditions: 'Allgemeine Geschäftsbedingungen',
    privacyPolicy: 'Datenschutz-Bestimmungen',

    orders: 'Bestellungen',
    items: 'Artikel',
    itemsTotal: 'Zwischensumme',
    discount: 'Rabatt',
    tax: 'Steuer',
    customer: 'Kunde',
    address: 'Adresse',
    vouchers: 'Gutscheine',
    totalOrders: 'Anzahl Bestellungen',

    pleaseLogin: 'Bitte anmelden',
    loginToSeeOrders: 'Melde dich an, um deine Bestellhistorie zu sehen.',
    loading: 'Wird geladen...',
    somethingWentWrong: 'Etwas ist schiefgelaufen',
    retry: 'Erneut versuchen',
    searchMenu: 'Im Menü suchen — Pizza, Burger, Pasta…',
    restaurantDetails: 'Restaurantdetails',
    preorder: 'Vorbestellen',
    noResults: 'Nichts gefunden',
    noResultsFor: 'Kein Gericht gefunden für',
    resetSearch: 'Suche zurücksetzen',
    minimumOrderValue: 'MBW',
    free: 'Gratis',
    freeDelivery: 'Lieferung gratis',
    socialNoEmail: 'Dieses Konto hat keine E-Mail-Adresse freigegeben. Bitte melden Sie sich mit Ihrer Telefonnummer an.',
    aboutRestaurant: 'Über uns',
    website: 'Webseite',
    notProvided: 'fehlt',
    fieldDescription: 'Beschreibung',
    fieldCuisine: 'Küchen-Tags',
    fieldRating: 'Bewertung',
    fieldDeliveryTime: 'Lieferzeit',
    fieldMinimumOrder: 'Mindestbestellwert',
    fieldOpeningHours: 'Öffnungszeiten',
    fieldAddress: 'Adresse',
    fieldPhone: 'Telefon',
    fieldLogo: 'Logo',
    optional: 'optional',
    required: 'Pflicht',
    added: 'Hinzugefügt',
    recommendedForYou: 'Für dich empfohlen',
    messageForRestaurant: 'Nachricht für das Restaurant',
    messageForRestaurantPlaceholder: 'Spezielle Wünsche, Allergien, Ernährungseinschränkungen oder Grußkartentext …',
    messageForRestaurantHint: 'Sonderwünsche, Allergien oder Grußkartentext',
    goToCheckout: 'Zur Kasse gehen',
    loginWelcome: 'Willkommen bei',
    loginSub: 'Melde dich an, um zu bestellen – oder bestelle direkt als Gast.',
    continueAsGuest: 'Als Gast bestellen',
    orDivider: 'oder',
    legalNoticePrefix: 'Mit der Anmeldung akzeptierst du unsere',
    legalNoticeAnd: 'und',
    otpTitle: 'Bestätigungscode',
    otpHeroTitle: 'Nur noch ein Schritt bis zu deiner Bestellung.',
    otpHeroSub: 'Wir haben dir einen Code per SMS geschickt. Gib ihn hier ein, um fortzufahren.',
    confirm: 'Bestätigen',
    otpSentTo: 'Gesendet an',
    resendOtp: 'Code erneut senden',
    active: 'Aktiv',
    pastOrders: 'Frühere Bestellungen',
    paymentCards: 'Kreditkarten',
    paymentOtherMethods: 'Weitere Zahlungsmethoden',
    addNewCard: 'Neue Karte hinzufügen',
    onlinePayment: 'Online-Zahlung',
    invoiceOrInstalments: 'Rechnung oder Ratenkauf',
    statusAccepted: 'Angenommen',
    isPreparingYourOrder: 'bereitet deine Bestellung zu',
    skipToContent: 'Zum Inhalt springen',
    voucherActivated: 'Gutschein aktiviert!',
    saved: 'gespart',
    menuLoadFailed: 'Speisekarte konnte nicht geladen werden',
    menuLoadFailedSub: 'Du siehst gerade nur eine Auswahl. Bitte lade die Seite neu.',
    reload: 'Neu laden',
    cartEmpty: 'Dein Warenkorb ist leer',
    cartEmptySub: 'Füge Gerichte hinzu, um zur Kasse zu gehen.',
    addMoreItems: 'Weitere Artikel hinzufügen',
    save: 'Speichern',
    edit: 'Ändern',
    tip: 'Trinkgeld',
    noTip: 'Kein',
    tipToDriver: '100 % an den Fahrer',
    tipToTeam: '100 % ans Team',
    tipThanksDriver: 'Danke! Dein Fahrer erhält 100 % des Trinkgelds.',
    tipThanksTeam: 'Danke! Das Team erhält 100 % des Trinkgelds.',
    onDelivery: 'Bei Lieferung',
    onPickup: 'Bei Abholung',
    bellName: 'Klingelname',
    bellNameRequired: 'Bitte gib einen Klingelnamen an',
    deliverySpeedLabel: 'Lieferzeit',
    standard: 'Standard',
    priority: 'Priority',
    zoneHeroTitle: 'Echte italienische Küche, frisch zu dir.',
    zoneFeature1: 'In 20–40 Min. bei dir',
    zoneFeature2: 'Frische Zutaten, täglich',
    zoneFeature3: '4,8 ★ · 820+ Bewertungen',
    deliveryAndPickup: 'Lieferung & Abholung',
    doWeDeliver: 'Liefern wir zu dir?',
    doWeDeliverSub: 'Gib deine Adresse ein — wir prüfen sofort, ob du im Liefergebiet liegst.',
    streetHouseAndPostcode: 'Straße, Hausnr. & PLZ',
    useCurrentLocation: 'Aktuellen Standort verwenden',
    checkDeliveryArea: 'Liefergebiet prüfen',
    bellNameRequiredField: 'Klingelname (Pflichtfeld)',
    callbackNumber: 'Rückrufnummer (Pflichtfeld)',
    phoneForQuestions: 'Telefonnummer für Rückfragen (Pflichtfeld)',
    redeem: 'Einlösen',
    or: 'oder',
    yourSavedDishes: 'Deine gespeicherten Gerichte',
    orderedItems: 'Bestellte Artikel',
    productInfo: 'Produktinfo',
    addMore: 'Mehr hinzufügen',
    paymentMethodsSummary: 'Bar, Karte, PayPal oder Klarna',
    redeemCode: 'Code einlösen',
    enterPromoCode: 'Rabatt- oder Promo-Code eingeben',
    chooseDeliveryTime: 'Lieferzeit wählen',
    soldOut: 'ausgebucht',
    saveOnYourOrder: 'Spare bei deiner Bestellung',
    enterCodeOrPickOffer: 'Code eingeben oder Aktion wählen',
    voucherCode: 'GUTSCHEINCODE',
    applied: 'Angewendet',
    voucherActive: 'AKTIV',
    availableOffers: 'Verfügbare Aktionen',
    payNow: 'Jetzt bezahlen',
    paymentFailed: 'Zahlung fehlgeschlagen',
    paymentType: 'Zahlungsart',
    callbackNumberShort: 'Rückrufnummer',
    driverInstructions: 'Anweisungen für den Fahrer (z. B. Hintertür, 3. Stock)',
    addressLookupUnavailable: 'Adresssuche nicht verfügbar',
    addressLookupUnavailableSub: 'Wir können deine PLZ gerade nicht automatisch prüfen. Wähle Abholung oder ruf uns an – wir prüfen es für dich.',
    weDeliverToYou: 'Juhu, wir liefern zu dir!',
    deliveryTimeApprox: 'Lieferzeit ca. 20–40 Min',
    from: 'ab',
    continueToMenu: 'Weiter zum Menü',
    outsideDeliveryArea: 'Leider außerhalb',
    outsideDeliveryAreaSub: 'Diese Adresse liegt außerhalb unseres Liefergebiets.',
    checkAnotherAddress: 'Andere Adresse prüfen',
    callUs: 'Anrufen',
    switchToPickupBrowse: 'Zur Abholung wechseln & stöbern',
    switchToPickup: 'Zur Abholung wechseln',
    addNewAddress: 'Neue Adresse hinzufügen',
    addressBookSub: 'Wähle eine gespeicherte Adresse oder füge eine neue hinzu.',
    saveAs: 'Als was speichern?',
    labelHome: 'Zuhause',
    labelWork: 'Arbeit',
    labelOther: 'Sonstige',
    chooseFromSuggestions: 'Bitte wähle eine Adresse aus den Vorschlägen',
    saveAddress: 'Adresse speichern',
    deleteAddress: 'Adresse löschen',
    exploreShopAnyway: 'Trotzdem Webshop entdecken',
    orderConfirmed: 'Bestellung bestätigt',
    orderConfirmedDeliverySub: 'Die Küche bereitet dein Essen zu.',
    orderConfirmedPickupSub: 'Die Küche bereitet dein Essen zu.',
    inProgress: 'In Bearbeitung',
    estimatedDelivery: 'Voraussichtliche Lieferung',
    readyForPickup: 'Bereit zur Abholung',
    preparation: 'Zubereitung',
    onTheWay: 'Unterwegs',
    delivered: 'Geliefert',
    ready: 'Bereit',
    pickedUp: 'Abgeholt',
    courierBeingAssigned: 'Kurier wird zugeteilt',
    courierBeingAssignedSub: 'Du wirst benachrichtigt, sobald jemand unterwegs ist',
    orderNumber: 'Bestellnummer',
    pickupAt: 'Abholung bei',
    payment: 'Zahlung',
    problemWithOrder: 'Problem mit der Bestellung?',
    helpAndSupport: 'Hilfe & Kundenservice',
    yourOrder: 'Deine Bestellung',
    backToHome: 'Zur Startseite',
    guest: 'Gast',
    welcomeBack: 'Willkommen zurück',
    myAccount: 'Mein Konto',
    orderingAsGuest: 'Du bestellst als Gast',
    orderingAsGuestSub: 'Melde dich an für Favoriten, Bestellverlauf & Prämien.',
    help: 'Hilfe',
    contactSupport: 'Kundenservice kontaktieren',
    changeLanguage: 'Sprache ändern',
    legal: 'Rechtliches',
    my: 'Meine',
    quickAccess: 'Schnellzugriff',
    myCart: 'Mein Warenkorb',
    logoutConfirm: 'Möchtest du dich wirklich abmelden?',
    privacy: 'Datenschutz',
    terms: 'AGB',
    imprint: 'Impressum',
    account: 'Konto',
    invite: 'Einladen',
    inviteTitle: '5 € für dich, 5 € für deine Freunde',
    inviteSub: 'Teile deinen Code. Bei der ersten Bestellung deines Freundes bekommt ihr beide 5 €.',
    copy: 'Kopieren',
    copied: 'Kopiert!',
    noReferralCode: 'Für dein Konto ist noch kein Empfehlungscode verfügbar.',
    cartItemsRemoved: 'Einige Artikel sind nicht mehr verfügbar und wurden aus deinem Warenkorb entfernt.',
    checkoutTitle: 'Zur Kasse',
    completeOrder: 'Bestellung abschließen',
    orderSummary: 'Bestellübersicht',
    subtotal: 'Zwischensumme',
    stillMissing: 'Noch offen',
    pleaseComplete: 'Bitte noch ausfüllen',
    loginFailed: 'Anmeldung fehlgeschlagen',
    choosePaymentMethod: 'Zahlungsmethode wählen',
    addVoucher: 'Gutschein hinzufügen',
    redeemCodeAndSave: 'Code einlösen und sparen',
    preorderPlanLater: 'Für später planen',
    emailUs: 'E-Mail',
    directions: 'Route',
    supportHours: 'Wir sind täglich 10–23 Uhr für dich da',
    orderDetails: 'Bestelldetails',
    deliveredTo: 'Geliefert an',
    viewOrder: 'Bestellung ansehen',
    reorder: 'Erneut bestellen',
    status: 'Status',
    day: 'Tag',
    time: 'Uhrzeit',
    today: 'Heute',
    tomorrow: 'Morgen',
    confirmPreorder: 'Vorbestellung bestätigen',
    preorderSubDelivery: 'Wähle Tag und Uhrzeit deiner Lieferung',
    preorderSubPickup: 'Wähle Tag und Uhrzeit deiner Abholung',
    openingHours: 'Öffnungszeiten',
    addressContact: 'Adresse & Kontakt',
    noOrdersYet: 'Noch keine Bestellungen',
    yourOrdersWillAppearHere: 'Deine letzten Bestellungen werden hier angezeigt.',
    notLoggedIn: 'Nicht angemeldet',
    logout: 'Abmelden',
    enterOtp: 'Geben Sie den OTP-Code ein',
    otpSendFailed: 'OTP konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
    sendOtp: 'OTP senden',
    invalidOtp: 'Ungültiger OTP. Bitte versuchen Sie es erneut.',
    verify: 'Verifizieren',
    otpExpired: 'OTP ist abgelaufen. Bitte fordern Sie ein neues an.',
    otpVerifyFailed: 'OTP konnte nicht verifiziert werden. Bitte versuchen Sie es erneut.',
    otpSessionExpired: 'OTP-Sitzung abgelaufen. Bitte senden Sie OTP erneut.',

    sentToStore: 'An Restaurant gesendet',
    inDelivery: 'In Zustellung',
    isDelivered: 'Geliefert',
    isCancelled: 'Storniert',
    enterVoucherCode: 'Gutscheincode eingeben',
    apply: 'Anwenden',
    remove: 'Entfernen',
    voucher: 'Gutschein',
    voucherApplyFailed: 'Gutschein konnte nicht angewendet werden',
    phoneHelper: 'Geben Sie Ihre Handynummer ohne führende 0 ein',
    login: 'Anmelden',
    profile: 'Profil',
    points: 'Punkte',
    hey: 'Hallo',
    favoriteProducts: 'Favoritenprodukte',
    register: 'Registrieren',
    loginToSeeProfileAndFavorites: 'Melden Sie sich an, um Profil und Favoriten zu sehen.',

    noFavoriteItemsYet: 'Noch keine Favoriten.',
    totalFavItems: 'Gesamtanzahl Favoriten',
    favorites: 'Favoriten',
    savedItemsForRestaurant: 'Gespeicherte Artikel für dieses Restaurant',
    clear: 'Löschen',
    VOUCHER_NOT_FOUND: 'Der eingegebene Gutscheincode ist ungültig. Bitte überprüfen Sie den Code und versuchen Sie es erneut.',
    LIMIT_EXCEEDED: 'Sie haben das Nutzungslimit für diesen Gutschein überschritten. Bitte überprüfen Sie die Gutscheinbedingungen.',
    MINIMUM_ORDER_VALUE_NOT_MET: 'Ihr Bestellwert erfüllt nicht den Mindestwert, um diesen Gutschein anzuwenden. Bitte fügen Sie Ihrer Bestellung weitere Artikel hinzu.',
    CUSTOMER_NOT_FOUND: 'Der dem Gutschein zugeordnete Kunde konnte nicht gefunden werden. Bitte stellen Sie sicher, dass Sie mit dem richtigen Konto angemeldet sind.',
  },
};

export function getCategoryTranslation(categoryId: string, language: Language): string {
  const mapping: Record<string, keyof Translations> = {
    'popular': 'popular',
    'truffle-season': 'truffleSeason',
    'lunchdeals': 'lunchDeals',
    'fentimans': 'fentimans',
    'burgers': 'burgers',
    'sides': 'sides',
    'sandwiches': 'sandwiches',
    'sauces': 'sauces',
    'wine': 'wine',
    'beer': 'beer',
    'soft-drinks': 'softDrinks',
    'milkshakes': 'milkshakes',
    'kids': 'kids',
  };

  const key = mapping[categoryId];
  return key ? translations[language][key]! : categoryId;
}
