/**
 * Smart Escape - Internationalization (i18n)
 * Provides full English and Bangla (বাংলা) localization for all UI elements,
 * buttons, statuses, messages, legends, and instructions.
 */

export const translations = {
  en: {
    // Header & Meta
    appTitle: 'SMART ESCAPE',
    appSubtitle: 'Interactive Evacuation Route Simulator',
    tagline: 'BUILD AN INTERACTIVE MAP. COMPUTE ROUTES. RESPOND TO CHANGING HAZARDS.',
    practiceChallenge: 'AI DEVFEST COMPETITION',

    // Language Toggle
    langEn: 'English',
    langBn: 'বাংলা',
    langToggleAria: 'Switch language between English and Bangla',

    // Top Controls
    importJson: 'Import JSON',
    uploadBtn: 'Upload building.json',
    loadSample: 'Load East Annex Sample',
    resetInitial: 'Reset to Initial State',
    clearAllHazards: 'Clear All Hazards',
    highContrastOn: 'High Contrast Mode: ON',
    highContrastOff: 'High Contrast Mode: OFF',
    soundOn: 'Audio Effects: ON',
    soundOff: 'Audio Effects: MUTED',
    exportPng: 'Export Map PNG',

    // Building Info
    buildingLabel: 'Building Name',
    activeHazards: 'Active Hazards',
    safeExits: 'Available Exits',
    totalNodes: 'Nodes',
    totalCorridors: 'Corridors',

    // Start Location
    selectStartLabel: 'Select Starting Location (Room or Junction)',
    startLocationPlaceholder: '-- Choose Start Node --',
    startLocationHint: 'Click any unblocked Room or Junction on the map or select from this dropdown.',
    selectedStart: 'Selected Start',

    // Routing Statuses & Results
    routeSummaryTitle: 'Evacuation Route Analysis',
    statusRouteFound: 'Valid evacuation route found',
    statusBlockedStart: 'Starting location blocked',
    statusNoRoute: 'No route available',
    statusNoStart: 'Select a starting location to calculate route',
    totalCost: 'Total Route Cost',
    destinationExit: 'Target Exit',
    nodeSequence: 'Node Sequence',
    corridorBreakdown: 'Corridor Step Breakdown',
    corridorHop: 'Hop',
    noRouteDetails: 'All exits are unreachable or cut off by hazards. Clear obstacles to restore evacuation path.',
    blockedStartDetails: 'The chosen start node is currently engulfed in hazard. Evacuees cannot enter or leave from this node.',

    // Walkthrough Simulator
    simulatorTitle: 'Evacuation Walkthrough Simulation',
    simStart: 'Start Simulation',
    simPause: 'Pause',
    simStep: 'Step Next',
    simReset: 'Reset Walkthrough',
    simSpeed: 'Simulation Speed',
    simSpeedSlow: '0.5x Slow',
    simSpeedNormal: '1.0x Normal',
    simSpeedFast: '2.0x Fast',
    simCurrentStep: 'Step',
    simAtLocation: 'Currently at',
    simEvacuated: 'Evacuation Complete! Reached safe exit',

    // Alternative Routes
    altRoutesTitle: 'Alternative Routes',
    altRouteBadge: 'Option',
    altRouteOptimal: 'Optimal',
    altRouteAdditional: 'Secondary Route',
    altRouteDiff: 'cost difference',

    // Interactive Map
    mapHeader: 'Interactive Architectural Blueprint',
    mapInstructions: 'Tip: Click rooms/junctions to toggle hazard (blocked). Click exits to open/close. Click corridors to block. Click unblocked node to select start.',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetZoom: 'Center & Fit',

    // Legend
    legendTitle: 'Map Legend',
    legendRoom: 'Room (Unblocked)',
    legendJunction: 'Junction (Unblocked)',
    legendExitOpen: 'Exit (Accessible)',
    legendExitClosed: 'Exit (Closed)',
    legendBlocked: 'Hazard / Blocked',
    legendStart: 'Selected Start Point',
    legendActiveRoute: 'Safest Evacuation Route',
    legendCorridor: 'Corridor Cost',

    // Hazard Control Panel
    hazardPanelTitle: 'Hazard Management Panel',
    roomsTab: 'Rooms',
    junctionsTab: 'Junctions',
    exitsTab: 'Exits',
    corridorsTab: 'Corridors',
    searchPlaceholder: 'Search by ID or label...',
    btnBlock: 'Block',
    btnUnblock: 'Unblock',
    btnClose: 'Close',
    btnOpen: 'Open',
    statusSafe: 'Clear',
    statusBlocked: 'Hazard / Blocked',
    statusClosed: 'Closed',

    // Validation & Errors
    importModalTitle: 'Import Building Dataset',
    dropZoneText: 'Drag and drop building.json here, or click to browse',
    dropZoneSubtext: 'Accepts standard JSON meeting AI DevFest specification (2-60 nodes, 1-150 edges)',
    validationFailed: 'JSON Validation Failed',
    validationErrorsCount: 'error(s) detected in file:',
    closeModal: 'Close',
    importedSuccessfully: 'Building dataset loaded and validated successfully!',

    // Footer
    footerText: 'Smart Escape • AI DevFest Practice Challenge • Developed strictly adhering to Official Rules',
    testSampleChecks: 'Run Sample Checks (Section 4.1)'
  },

  bn: {
    // Header & Meta
    appTitle: 'স্মার্ট এস্কেপ (SMART ESCAPE)',
    appSubtitle: 'ইন্টারেক্টিভ নিরাপদ নির্গমন পথ সিমুলেটর',
    tagline: 'ইন্টারেক্টিভ ম্যাপ তৈরি করুন। দ্রুততম রুট গণনা করুন। বিপদ মোকাবেলা করুন।',
    practiceChallenge: 'এআই ডেভফেস্ট প্রতিযোগিতা',

    // Language Toggle
    langEn: 'English',
    langBn: 'বাংলা',
    langToggleAria: 'ইংরেজি ও বাংলা ভাষার মধ্যে পরিবর্তন করুন',

    // Top Controls
    importJson: 'জেসন ইমপোর্ট',
    uploadBtn: 'building.json আপলোড করুন',
    loadSample: 'নমুনা ডাটা লোড করুন (East Annex)',
    resetInitial: 'প্রাথমিক অবস্থায় রিসেট',
    clearAllHazards: 'সকল বিপদ মুছে ফেলুন',
    highContrastOn: 'উচ্চ বৈসাদৃশ্য: চালু',
    highContrastOff: 'উচ্চ বৈসাদৃশ্য: বন্ধ',
    soundOn: 'শব্দ সংকেত: চালু',
    soundOff: 'শব্দ সংকেত: নিঃশব্দ',
    exportPng: 'ম্যাপ পিএনজি ডাউনলোড',

    // Building Info
    buildingLabel: 'ভবনের নাম',
    activeHazards: 'সক্রিয় বিপদসমূহ',
    safeExits: 'উন্মুক্ত প্রস্থান',
    totalNodes: 'মোট নোড',
    totalCorridors: 'করিডোর',

    // Start Location
    selectStartLabel: 'শুরুর অবস্থান নির্বাচন করুন (কক্ষ বা সংযোগস্থল)',
    startLocationPlaceholder: '-- শুরুর নোড বেছে নিন --',
    startLocationHint: 'ম্যাপের যে কোনো উন্মুক্ত কক্ষ বা সংযোগস্থলে ক্লিক করুন অথবা তালিকা থেকে বেছে নিন।',
    selectedStart: 'নির্বাচিত শুরুর নোড',

    // Routing Statuses & Results
    routeSummaryTitle: 'নির্গমন পথের ফলাফল',
    statusRouteFound: 'নিরাপদ নির্গমন পথ পাওয়া গেছে',
    statusBlockedStart: 'Starting location blocked',
    statusNoRoute: 'No route available',
    statusNoStart: 'রুট গণনা করার জন্য একটি শুরুর অবস্থান নির্বাচন করুন',
    totalCost: 'মোট পথ খরচ (Cost)',
    destinationExit: 'গন্তব্য প্রস্থান (Exit)',
    nodeSequence: 'নোড পর্যায়ক্রম (Node Sequence)',
    corridorBreakdown: 'করিডোর অনুযায়ী বিবরণ',
    corridorHop: 'ধাপ',
    noRouteDetails: 'সকল প্রস্থান অবরুদ্ধ অথবা বিপদের কারণে বিচ্ছিন্ন। নির্গমন পথ পুনরুদ্ধারের জন্য বাধা অপসারণ করুন।',
    blockedStartDetails: 'নির্বাচিত শুরুর অবস্থানটি বর্তমানে বিপদের কবলে অবরুদ্ধ। এই নোড থেকে প্রবেশ বা প্রস্থান অসম্ভব।',

    // Walkthrough Simulator
    simulatorTitle: 'নির্গমন সিমুলেশন ও এনিমেশন',
    simStart: 'সিমুলেশন শুরু',
    simPause: 'স্থগিত',
    simStep: 'পরবর্তী ধাপ',
    simReset: 'সিমুলেশন রিসেট',
    simSpeed: 'সিমুলেশন গতি',
    simSpeedSlow: '০.৫x ধীর',
    simSpeedNormal: '১.০x স্বাভাবিক',
    simSpeedFast: '২.০x দ্রুত',
    simCurrentStep: 'ধাপ',
    simAtLocation: 'বর্তমান অবস্থান',
    simEvacuated: 'নিরাপদে নির্গমন সম্পন্ন হয়েছে!',

    // Alternative Routes
    altRoutesTitle: 'বিকল্প পথসমূহ',
    altRouteBadge: 'বিকল্প',
    altRouteOptimal: 'সর্বোত্তম',
    altRouteAdditional: 'দ্বিতীয় সেরা রুট',
    altRouteDiff: 'খরচের ব্যবধান',

    // Interactive Map
    mapHeader: 'ইন্টারেক্টিভ ব্লুপ্রিন্ট ম্যাপ',
    mapInstructions: 'পরামর্শ: কক্ষ/সংযোগস্থলে ক্লিক করে অবরুদ্ধ করুন। প্রস্থানে ক্লিক করে খুলুন/বন্ধ করুন। করিডোরে ক্লিক করে বন্ধ করুন। শুরুর বিন্দু বাছাই করতে উন্মুক্ত নোডে ক্লিক করুন।',
    zoomIn: 'বড় করুন (+)',
    zoomOut: 'ছোট করুন (-)',
    resetZoom: 'ম্যাপ কেন্দ্র করুন',

    // Legend
    legendTitle: 'ম্যাপ নির্দেশিকা (Legend)',
    legendRoom: 'কক্ষ (Room)',
    legendJunction: 'সংযোগস্থল (Junction)',
    legendExitOpen: 'উন্মুক্ত প্রস্থান (Open Exit)',
    legendExitClosed: 'বন্ধ প্রস্থান (Closed Exit)',
    legendBlocked: 'বিপদ / অবরুদ্ধ (Blocked)',
    legendStart: 'শুরুর অবস্থান (Start)',
    legendActiveRoute: 'সবচেয়ে নিরাপদ রুট',
    legendCorridor: 'করিডোর খরচ (Cost)',

    // Hazard Control Panel
    hazardPanelTitle: 'বিপদ ও নিরাপত্তা নিয়ন্ত্রণ প্যানেল',
    roomsTab: 'কক্ষসমূহ',
    junctionsTab: 'সংযোগস্থলসমূহ',
    exitsTab: 'প্রস্থানসমূহ',
    corridorsTab: 'করিডোরসমূহ',
    searchPlaceholder: 'আইডি বা নাম দিয়ে খুঁজুন...',
    btnBlock: 'অবরুদ্ধ করুন',
    btnUnblock: 'মুক্ত করুন',
    btnClose: 'বন্ধ করুন',
    btnOpen: 'খুলুন',
    statusSafe: 'নিরাপদ',
    statusBlocked: 'অবরুদ্ধ / বিপদ',
    statusClosed: 'বন্ধ',

    // Validation & Errors
    importModalTitle: 'ভবনের ডাটা ইমপোর্ট করুন',
    dropZoneText: 'এখানে building.json ফাইলটি টেনে এনে ফেলুন, অথবা ফাইল নির্বাচন করুন',
    dropZoneSubtext: 'এআই ডেভফেস্ট স্পেসিফিকেশন অনুযায়ী ফরম্যাট সমর্থন করে (২-৬০ নোড, ১-১৫০ করিডোর)',
    validationFailed: 'জেসন যাচাইকরণ ব্যর্থ হয়েছে',
    validationErrorsCount: 'টি ত্রুটি শনাক্ত হয়েছে:',
    closeModal: 'বন্ধ করুন',
    importedSuccessfully: 'ভবনের ডাটা সফলভাবে যাচাই ও লোড করা হয়েছে!',

    // Footer
    footerText: 'স্মার্ট এস্কেপ • এআই ডেভফেস্ট মক টেস্ট চ্যালেঞ্জ • অফিশিয়াল রুলবুক অনুসারে নির্মিত',
    testSampleChecks: 'অফিসিয়াল নমুনা টেস্ট যাচাই (Section 4.1)'
  }
};
