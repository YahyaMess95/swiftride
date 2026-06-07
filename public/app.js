/* ==========================================================================
   SwiftRide VTC - Showcase Website Interactive Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ----------------------------------------------------------------------
    // 0. INTERNATIONALIZATION (i18n) LOGIC
    // ----------------------------------------------------------------------
    const supportedLangs = ['fr', 'en', 'ar', 'es', 'it'];
    let currentLang = 'fr';
    let bookingDatePicker = null;

    const CITY_TRANSLATIONS = {
        cannes: { fr: 'Cannes', en: 'Cannes', ar: 'كان', es: 'Cannes', it: 'Cannes' },
        monaco: { fr: 'Monaco', en: 'Monaco', ar: 'موناكو', es: 'Mónaco', it: 'Monaco' },
        'saint-tropez': { fr: 'Saint-Tropez', en: 'Saint-Tropez', ar: 'سان تروبيه', es: 'Saint-Tropez', it: 'Saint-Tropez' },
        marseille: { fr: 'Marseille', en: 'Marseille', ar: 'مارسيليا', es: 'Marsella', it: 'Marsiglia' }
    };

    function getTranslation(key, lang = currentLang) {
        if (window.translations && window.translations[lang] && window.translations[lang][key]) {
            return window.translations[lang][key];
        }
        // Fallback to french
        if (window.translations && window.translations['fr'] && window.translations['fr'][key]) {
            return window.translations['fr'][key];
        }
        return key;
    }

    function initLanguage() {
        const savedLang = localStorage.getItem('preferredLang');
        if (savedLang && supportedLangs.includes(savedLang)) {
            currentLang = savedLang;
        } else {
            const browserLang = navigator.language.substring(0, 2).toLowerCase();
            if (supportedLangs.includes(browserLang)) {
                currentLang = browserLang;
            } else {
                currentLang = 'fr';
            }
        }
        updateLanguageUI(currentLang);
    }

    function updateLanguageUI(lang) {
        currentLang = lang;
        document.documentElement.lang = lang;
        
        // Handle RTL for Arabic
        if (lang === 'ar') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }

        // Update current lang text in switcher
        const currentLangEl = document.querySelector('.current-lang');
        if (currentLangEl) {
            currentLangEl.textContent = lang.toUpperCase();
        }

        // Update active class in dropdown links
        const langDropdownLinks = document.querySelectorAll('#langDropdown a');
        langDropdownLinks.forEach(link => {
            if (link.getAttribute('data-lang') === lang) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Translate standard data-i18n elements
        const elementsToTranslate = document.querySelectorAll('[data-i18n]');
        elementsToTranslate.forEach(el => {
            const key = el.getAttribute('data-i18n');
            let translation = getTranslation(key);
            
            // Handle {num} placeholder replacement
            if (el.hasAttribute('data-i18n-num')) {
                translation = translation.replace('{num}', el.getAttribute('data-i18n-num'));
            }
            
            // Handle element tags
            if (el.tagName === 'TITLE') {
                document.title = translation;
            } else if (el.tagName === 'INPUT' && el.hasAttribute('data-i18n-val')) {
                el.value = translation;
            } else {
                if (translation.includes('<') && translation.includes('>')) {
                    el.innerHTML = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });

        // Translate placeholders
        const elementsWithPlaceholder = document.querySelectorAll('[data-i18n-placeholder]');
        elementsWithPlaceholder.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.setAttribute('placeholder', getTranslation(key));
        });

        // Translate SEO Metadata
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', getTranslation('meta-desc'));
        }
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) {
            metaKeywords.setAttribute('content', getTranslation('meta-keywords'));
        }
        
        // Open Graph Meta
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', getTranslation('meta-title'));
        const ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription) ogDescription.setAttribute('content', getTranslation('meta-desc'));
        
        // Twitter meta
        const twTitle = document.querySelector('meta[name="twitter:title"]');
        if (twTitle) twTitle.setAttribute('content', getTranslation('meta-title'));
        const twDescription = document.querySelector('meta[name="twitter:description"]');
        if (twDescription) twDescription.setAttribute('content', getTranslation('meta-desc'));

        // Refresh calculator output if results are showing
        if (resultContent && resultContent.style.display === 'block') {
            refreshCalculatorResults();
        }

        // Initialize or update Flatpickr with the selected language locale
        initFlatpickr(lang);

        // Refresh booking price dynamic details with the new language
        if (typeof updateBookingPrice === 'function') {
            updateBookingPrice();
        }
    }

    function refreshCalculatorResults() {
        const destValue = dropoffSelect.value;
        const selectedVehicleEl = document.querySelector('input[name="calcVehicle"]:checked');
        const vehicleType = selectedVehicleEl ? selectedVehicleEl.value : 'sedan';
        
        const destName = destValue === 'autre' ? getTranslation('js-custom-destination') : (CITY_TRANSLATIONS[destValue] ? CITY_TRANSLATIONS[destValue][currentLang] : destValue);
        const vehicleLabel = vehicleType === 'business' ? getTranslation('js-vehicle-business') : (vehicleType === 'sedan' ? getTranslation('js-vehicle-sedan') : getTranslation('js-vehicle-van'));
        
        if (resDestination) resDestination.textContent = destName;
        if (resVehicleLabel) resVehicleLabel.textContent = vehicleLabel;
    }

    function initFlatpickr(lang) {
        const dateInput = document.getElementById('bookDate');
        if (!dateInput) return;

        // Save current value if any
        const currentValue = dateInput.value;

        if (bookingDatePicker) {
            bookingDatePicker.destroy();
        }

        // Set Flatpickr options
        const config = {
            enableTime: true,
            dateFormat: "d/m/Y H:i",
            time_24hr: true,
            minDate: "today",
            locale: lang === 'en' ? 'default' : lang,
            // Customizing accessibility & behavior
            disableMobile: "true" // Force flatpickr on mobile instead of native pickers for premium look
        };

        bookingDatePicker = flatpickr(dateInput, config);

        // Restore date value if it existed
        if (currentValue) {
            bookingDatePicker.setDate(currentValue, false);
        }
    }

    // Language switcher toggle and clicks
    const langBtn = document.getElementById('langBtn');
    const langSelector = document.querySelector('.lang-selector');
    const langDropdownLinks = document.querySelectorAll('#langDropdown a');

    if (langBtn && langSelector) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langSelector.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            langSelector.classList.remove('active');
        });
    }

    langDropdownLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedLang = link.getAttribute('data-lang');
            localStorage.setItem('preferredLang', selectedLang);
            updateLanguageUI(selectedLang);
            if (langSelector) langSelector.classList.remove('active');
        });
    });

    // ----------------------------------------------------------------------
    // 1. STICKY HEADER & SCROLL EFFECTS
    // ----------------------------------------------------------------------
    const header = document.querySelector('.main-header');
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Highlight active navigation section on scroll
        let currentSectionId = 'accueil';
        const sections = document.querySelectorAll('section');
        const scrollPosition = window.scrollY + 120; // offset for sticky header
        
        sections.forEach(section => {
            if (scrollPosition >= section.offsetTop) {
                currentSectionId = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });

    // ----------------------------------------------------------------------
    // 2. MOBILE NAVIGATION (HAMBURGER MENU)
    // ----------------------------------------------------------------------
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navMenu = document.getElementById('navMenu');
    
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close menu when a link is clicked
        const menuLinks = navMenu.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburgerBtn.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // ----------------------------------------------------------------------
    // 3. FARE CALCULATOR LOGIC (3.20 € / km)
    // ----------------------------------------------------------------------
    const PRICE_PER_KM = 3.20;
    const VEHICLE_COEFFICIENTS = {
        business: 0.85, // 15% discount for E-Class Business Sedan
        sedan: 1.0,     // base pricing
        van: 1.2        // 20% comfort/space coefficient for vans
    };
    
    const DESTINATIONS_DATA = {
        cannes: { name: 'Cannes', distance: 30 },
        monaco: { name: 'Monaco', distance: 32 },
        'saint-tropez': { name: 'Saint-Tropez', distance: 110 },
        marseille: { name: 'Marseille', distance: 185 }
    };
    
    const dropoffSelect = document.getElementById('calcDropoff');
    const customDistanceGroup = document.getElementById('customDistanceGroup');
    const customDistanceInput = document.getElementById('customDistance');
    const vehicleRadioOptions = document.querySelectorAll('.vehicle-radio-option');
    const btnCalculate = document.getElementById('btnCalculate');
    
    const resultPlaceholder = document.getElementById('resultPlaceholder');
    const resultContent = document.getElementById('resultContent');
    const resDestination = document.getElementById('resDestination');
    const resDistanceLabel = document.getElementById('resDistance');
    const resVehicleLabel = document.getElementById('resVehicle');
    const resPriceLabel = document.getElementById('resPrice');
    const btnBookTransfer = document.getElementById('btnBookTransfer');
    
    // Toggle custom distance input based on destination selection
    if (dropoffSelect && customDistanceGroup) {
        dropoffSelect.addEventListener('change', (e) => {
            if (e.target.value === 'autre') {
                customDistanceGroup.style.display = 'flex';
                customDistanceInput.setAttribute('required', 'true');
            } else {
                customDistanceGroup.style.display = 'none';
                customDistanceInput.removeAttribute('required');
                customDistanceInput.value = '';
            }
        });
    }
    
    // Handle vehicle category styling on check
    vehicleRadioOptions.forEach(option => {
        option.addEventListener('click', () => {
            vehicleRadioOptions.forEach(opt => opt.classList.remove('checked'));
            option.classList.add('checked');
            
            const radio = option.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });
    
    // Perform pricing estimation calculation
    if (btnCalculate) {
        btnCalculate.addEventListener('click', () => {
            const destValue = dropoffSelect.value;
            let distance = 0;
            let destName = '';
            
            if (destValue === 'autre') {
                distance = parseFloat(customDistanceInput.value);
                destName = getTranslation('js-custom-destination');
                
                if (isNaN(distance) || distance <= 0) {
                    customDistanceInput.classList.add('error');
                    alert(getTranslation('js-error-distance'));
                    return;
                } else {
                    customDistanceInput.classList.remove('error');
                }
            } else {
                const data = DESTINATIONS_DATA[destValue];
                distance = data.distance;
                destName = CITY_TRANSLATIONS[destValue] ? CITY_TRANSLATIONS[destValue][currentLang] : data.name;
            }
            
            // Get selected vehicle option
            const selectedVehicleEl = document.querySelector('input[name="calcVehicle"]:checked');
            const vehicleType = selectedVehicleEl ? selectedVehicleEl.value : 'sedan';
            const vehicleLabel = vehicleType === 'business' ? getTranslation('js-vehicle-business') : (vehicleType === 'sedan' ? getTranslation('js-vehicle-sedan') : getTranslation('js-vehicle-van'));
            
            // Calculate total price
            const coefficient = VEHICLE_COEFFICIENTS[vehicleType];
            const totalPrice = distance * PRICE_PER_KM * coefficient;
            
            // Update Result Panel
            if (resDestination) resDestination.textContent = destName;
            if (resDistanceLabel) resDistanceLabel.textContent = `${distance} km`;
            if (resVehicleLabel) resVehicleLabel.textContent = vehicleLabel;
            
            // Show result block and hide placeholder
            resultPlaceholder.style.display = 'none';
            resultContent.style.display = 'block';
            
            // Animate price counter
            animatePrice(totalPrice);
            
            // Save state on book button for transfer to contact form
            btnBookTransfer.setAttribute('data-target-dest-val', destValue);
            btnBookTransfer.setAttribute('data-target-dest', destName);
            btnBookTransfer.setAttribute('data-target-vehicle', vehicleType);
            btnBookTransfer.setAttribute('data-target-distance', distance);
            btnBookTransfer.setAttribute('data-target-price', totalPrice.toFixed(2));
        });
    }
    
    // Price animation counter function
    function animatePrice(targetValue) {
        const start = 0;
        const duration = 800; // in ms
        const startTime = performance.now();
        
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out quad
            const easeProgress = progress * (2 - progress);
            const currentValue = start + (targetValue - start) * easeProgress;
            
            resPriceLabel.textContent = currentValue.toFixed(2);
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                resPriceLabel.textContent = targetValue.toFixed(2);
            }
        }
        
        requestAnimationFrame(updateCounter);
    }

    // ----------------------------------------------------------------------
    // 4. CROSS-SECTION DELEGATION (PASSING DETAILS TO BOOKING FORM)
    // ----------------------------------------------------------------------
    const bookPickupInput = document.getElementById('bookPickup');
    const bookDropoffInput = document.getElementById('bookDropoff');
    const bookVehicleSelect = document.getElementById('bookVehicle');
    const bookNotesTextarea = document.getElementById('bookNotes');

    const bookCustomDistanceGroup = document.getElementById('bookCustomDistanceGroup');
    const bookCustomDistanceInput = document.getElementById('bookCustomDistance');
    const bookCustomAddressGroup = document.getElementById('bookCustomAddressGroup');
    const bookCustomAddressInput = document.getElementById('bookCustomAddress');
    const bookEstimatedPriceLabel = document.getElementById('bookEstimatedPrice');
    const bookPriceDetailsLabel = document.getElementById('bookPriceDetails');

    function getBookingRouteDetails() {
        if (!bookDropoffInput) return { destName: '', distance: 0 };
        const dropoffVal = bookDropoffInput.value;
        let destName = '';
        let distance = 0;
        
        if (dropoffVal === 'autre') {
            destName = bookCustomAddressInput ? bookCustomAddressInput.value.trim() : '';
            distance = bookCustomDistanceInput ? parseFloat(bookCustomDistanceInput.value) || 0 : 0;
        } else if (dropoffVal) {
            const data = DESTINATIONS_DATA[dropoffVal];
            if (data) {
                distance = data.distance;
                destName = CITY_TRANSLATIONS[dropoffVal] ? CITY_TRANSLATIONS[dropoffVal][currentLang] : data.name;
            }
        }
        return { destName, distance };
    }

    function updateBookingPrice() {
        if (!bookEstimatedPriceLabel || !bookPriceDetailsLabel) return;
        
        if (!bookDropoffInput || !bookDropoffInput.value) {
            bookEstimatedPriceLabel.textContent = '0.00';
            bookPriceDetailsLabel.textContent = getTranslation('js-select-options');
            return;
        }
        
        const { destName, distance } = getBookingRouteDetails();
        
        if (bookDropoffInput.value === 'autre' && (isNaN(distance) || distance <= 0)) {
            bookEstimatedPriceLabel.textContent = '0.00';
            bookPriceDetailsLabel.textContent = getTranslation('js-enter-distance');
            return;
        }
        
        const vehicleType = bookVehicleSelect ? bookVehicleSelect.value : 'business';
        const coefficient = VEHICLE_COEFFICIENTS[vehicleType] || 1.0;
        const totalPrice = distance * PRICE_PER_KM * coefficient;
        
        bookEstimatedPriceLabel.textContent = totalPrice.toFixed(2);
        
        const vehicleLabel = vehicleType === 'business' ? getTranslation('js-vehicle-business') : (vehicleType === 'sedan' ? getTranslation('js-vehicle-sedan') : getTranslation('js-vehicle-van'));
        
        bookPriceDetailsLabel.textContent = `${getTranslation('calc-val-pickup')} ➔ ${destName || getTranslation('js-custom-destination')} (${distance} km) | ${vehicleLabel}`;
    }

    if (bookDropoffInput) {
        bookDropoffInput.addEventListener('change', () => {
            const val = bookDropoffInput.value;
            if (val === 'autre') {
                if (bookCustomDistanceGroup) bookCustomDistanceGroup.style.display = 'block';
                if (bookCustomAddressGroup) bookCustomAddressGroup.style.display = 'block';
                if (bookCustomDistanceInput) bookCustomDistanceInput.setAttribute('required', 'true');
                if (bookCustomAddressInput) bookCustomAddressInput.setAttribute('required', 'true');
            } else {
                if (bookCustomDistanceGroup) bookCustomDistanceGroup.style.display = 'none';
                if (bookCustomAddressGroup) bookCustomAddressGroup.style.display = 'none';
                if (bookCustomDistanceInput) {
                    bookCustomDistanceInput.removeAttribute('required');
                    bookCustomDistanceInput.value = '';
                    bookCustomDistanceInput.classList.remove('error');
                }
                if (bookCustomAddressInput) {
                    bookCustomAddressInput.removeAttribute('required');
                    bookCustomAddressInput.value = '';
                    bookCustomAddressInput.classList.remove('error');
                }
            }
            updateBookingPrice();
        });
    }

    if (bookCustomDistanceInput) {
        bookCustomDistanceInput.addEventListener('input', updateBookingPrice);
    }
    if (bookCustomAddressInput) {
        bookCustomAddressInput.addEventListener('input', updateBookingPrice);
    }
    if (bookVehicleSelect) {
        bookVehicleSelect.addEventListener('change', updateBookingPrice);
    }
    
    // Link 1: Booking button from calculator result card
    if (btnBookTransfer) {
        btnBookTransfer.addEventListener('click', () => {
            const destVal = btnBookTransfer.getAttribute('data-target-dest-val') || 'monaco';
            const dest = btnBookTransfer.getAttribute('data-target-dest');
            const vehicle = btnBookTransfer.getAttribute('data-target-vehicle');
            const distance = btnBookTransfer.getAttribute('data-target-distance');
            const price = btnBookTransfer.getAttribute('data-target-price');
            
            // Populate form
            if (bookDropoffInput) {
                bookDropoffInput.value = destVal;
                // Trigger change event to show/hide custom sections and update price
                bookDropoffInput.dispatchEvent(new Event('change'));
                
                if (destVal === 'autre') {
                    const bookCustomDistanceInput = document.getElementById('bookCustomDistance');
                    if (bookCustomDistanceInput) bookCustomDistanceInput.value = distance;
                    const bookCustomAddressInput = document.getElementById('bookCustomAddress');
                    if (bookCustomAddressInput) bookCustomAddressInput.value = dest;
                    
                    // Trigger input event to update the booking price
                    if (bookCustomDistanceInput) bookCustomDistanceInput.dispatchEvent(new Event('input'));
                }
            }
            if (bookVehicleSelect) {
                bookVehicleSelect.value = vehicle;
                bookVehicleSelect.dispatchEvent(new Event('change'));
            }
            
            if (bookNotesTextarea) {
                const prefillTemplate = getTranslation('js-prefill-estimate')
                    .replace('{dest}', dest)
                    .replace('{distance}', distance)
                    .replace('{price}', price);
                bookNotesTextarea.value = prefillTemplate;
            }
            
            // Smooth scroll to form
            scrollToBookingSection();
        });
    }
    
    // Link 2: Quick book buttons from popular destinations grid
    const quickBookBtns = document.querySelectorAll('.quick-book-btn');
    quickBookBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const destKey = e.target.getAttribute('data-dest');
            const data = DESTINATIONS_DATA[destKey];
            
            if (data) {
                const translatedDest = CITY_TRANSLATIONS[destKey] ? CITY_TRANSLATIONS[destKey][currentLang] : data.name;
                if (bookDropoffInput) {
                    bookDropoffInput.value = destKey;
                    bookDropoffInput.dispatchEvent(new Event('change'));
                }
                if (bookNotesTextarea) {
                    const prefillTemplate = getTranslation('js-prefill-popular')
                        .replace('{dest}', translatedDest)
                        .replace('{distance}', data.distance);
                    bookNotesTextarea.value = prefillTemplate;
                }
            }
            
            scrollToBookingSection();
        });
    });
    
    // Link 3: "Réserver" buttons in the fleet cards
    const selectVehicleBtns = document.querySelectorAll('.select-vehicle-btn');
    selectVehicleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const vehicle = e.target.getAttribute('data-vehicle');
            if (bookVehicleSelect) {
                bookVehicleSelect.value = vehicle;
                bookVehicleSelect.dispatchEvent(new Event('change'));
            }
            
            const vehicleLabel = vehicle === 'business' ? getTranslation('js-vehicle-business') : (vehicle === 'sedan' ? getTranslation('js-vehicle-sedan') : getTranslation('js-vehicle-van'));
            if (bookNotesTextarea) {
                const prefillTemplate = getTranslation('js-prefill-vehicle')
                    .replace('{vehicle}', vehicleLabel);
                bookNotesTextarea.value = prefillTemplate;
            }
            
            // Smooth scroll to form is handled natively by href="#contact", 
            // but we can trigger focus styling
            setTimeout(highlightBookingForm, 400);
        });
    });
    
    function scrollToBookingSection() {
        const contactSection = document.getElementById('contact');
        if (contactSection) {
            window.scrollTo({
                top: contactSection.offsetTop - 80, // offset for sticky header
                behavior: 'smooth'
            });
            setTimeout(highlightBookingForm, 800);
        }
    }
    
    function highlightBookingForm() {
        const formPanel = document.querySelector('.booking-form-pane');
        if (formPanel) {
            formPanel.style.transition = 'all 0.3s ease';
            formPanel.style.borderColor = 'var(--color-primary-gold)';
            formPanel.style.boxShadow = '0 0 30px rgba(212, 175, 55, 0.3)';
            
            setTimeout(() => {
                formPanel.style.borderColor = 'var(--color-glass-border)';
                formPanel.style.boxShadow = 'var(--shadow-premium)';
            }, 1500);
        }
    }

    // ----------------------------------------------------------------------
    // 4.5 LUGGAGE COUNT DYNAMIC SIZES SELECTOR
    // ----------------------------------------------------------------------
    const bookLuggageCountSelect = document.getElementById('bookLuggageCount');
    const luggageSizesContainer = document.getElementById('luggageSizesContainer');

    if (bookLuggageCountSelect && luggageSizesContainer) {
        bookLuggageCountSelect.addEventListener('change', (e) => {
            const count = parseInt(e.target.value) || 0;
            luggageSizesContainer.innerHTML = '';
            
            if (count === 0) {
                luggageSizesContainer.style.display = 'none';
            } else {
                luggageSizesContainer.style.display = 'grid';
                for (let i = 1; i <= count; i++) {
                    const formGroup = document.createElement('div');
                    formGroup.className = 'form-group';
                    formGroup.innerHTML = `
                        <label data-i18n="book-form-luggage-size" data-i18n-num="${i}">${getTranslation('book-form-luggage-size').replace('{num}', i)}</label>
                        <div class="select-wrapper">
                            <select class="luggage-size-select" data-luggage-index="${i}">
                                <option value="medium" data-i18n="opt-size-medium">${getTranslation('opt-size-medium')}</option>
                                <option value="large" data-i18n="opt-size-large" selected>${getTranslation('opt-size-large')}</option>
                                <option value="xlarge" data-i18n="opt-size-xlarge">${getTranslation('opt-size-xlarge')}</option>
                            </select>
                        </div>
                    `;
                    luggageSizesContainer.appendChild(formGroup);
                }
            }
        });
    }

    // ----------------------------------------------------------------------
    // 4.6 BOOKING WIZARD NAVIGATION & VALIDATION
    // ----------------------------------------------------------------------
    let currentStep = 1;
    
    const btnPrevStep = document.getElementById('btnPrevStep');
    const btnNextStep = document.getElementById('btnNextStep');
    const btnSubmitBooking = document.getElementById('btnSubmitBooking');

    function validateStep(step) {
        let isValid = true;
        if (step === 1) {
            const pickup = document.getElementById('bookPickup');
            const dropoff = document.getElementById('bookDropoff');
            const date = document.getElementById('bookDate');
            
            [pickup, dropoff, date].forEach(input => {
                if (input) {
                    if (!input.value.trim()) {
                        input.classList.add('error');
                        isValid = false;
                    } else {
                        input.classList.remove('error');
                    }
                }
            });

            if (dropoff && dropoff.value === 'autre') {
                const customDistance = document.getElementById('bookCustomDistance');
                const customAddress = document.getElementById('bookCustomAddress');
                
                if (customDistance) {
                    const distVal = parseFloat(customDistance.value);
                    if (isNaN(distVal) || distVal <= 0) {
                        customDistance.classList.add('error');
                        isValid = false;
                    } else {
                        customDistance.classList.remove('error');
                    }
                }
                
                if (customAddress) {
                    if (!customAddress.value.trim()) {
                        customAddress.classList.add('error');
                        isValid = false;
                    } else {
                        customAddress.classList.remove('error');
                    }
                }
            }
        } else if (step === 3) {
            const name = document.getElementById('bookName');
            const email = document.getElementById('bookEmail');
            const phone = document.getElementById('bookPhone');
            
            [name, email, phone].forEach(input => {
                if (input) {
                    if (!input.value.trim()) {
                        input.classList.add('error');
                        isValid = false;
                    } else {
                        input.classList.remove('error');
                    }
                }
            });
            
            if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
                email.classList.add('error');
                isValid = false;
            }
        }
        return isValid;
    }

    function updateWizardUI() {
        // 1. Show/hide panes
        document.querySelectorAll('.wizard-step-pane').forEach((pane, idx) => {
            if (idx + 1 === currentStep) {
                pane.style.display = 'block';
                pane.classList.add('active');
            } else {
                pane.style.display = 'none';
                pane.classList.remove('active');
            }
        });

        // 2. Update step indicators
        const indicators = document.querySelectorAll('.wizard-step-indicator');
        indicators.forEach((indicator, idx) => {
            const step = idx + 1;
            if (step < currentStep) {
                indicator.classList.add('completed');
                indicator.classList.remove('active');
            } else if (step === currentStep) {
                indicator.classList.add('active');
                indicator.classList.remove('completed');
            } else {
                indicator.classList.remove('active', 'completed');
            }
        });

        // Update connecting lines
        const lines = document.querySelectorAll('.wizard-step-line');
        lines.forEach((line, idx) => {
            const lineStep = idx + 1;
            if (lineStep < currentStep) {
                line.classList.add('completed');
            } else {
                line.classList.remove('completed');
            }
        });

        // 3. Update buttons visibility
        if (currentStep === 1) {
            if (btnPrevStep) btnPrevStep.style.display = 'none';
            if (btnNextStep) btnNextStep.style.display = 'inline-flex';
            if (btnSubmitBooking) btnSubmitBooking.style.display = 'none';
        } else if (currentStep === 4) {
            if (btnPrevStep) btnPrevStep.style.display = 'inline-flex';
            if (btnNextStep) btnNextStep.style.display = 'none';
            if (btnSubmitBooking) btnSubmitBooking.style.display = 'inline-flex';
        } else {
            if (btnPrevStep) btnPrevStep.style.display = 'inline-flex';
            if (btnNextStep) btnNextStep.style.display = 'inline-flex';
            if (btnSubmitBooking) btnSubmitBooking.style.display = 'none';
        }
    }

    if (btnNextStep) {
        btnNextStep.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                currentStep++;
                updateWizardUI();
                
                // Scroll slightly to top of form panel for nice mobile UX
                const formPanel = document.querySelector('.booking-form-pane');
                if (formPanel) {
                    window.scrollTo({
                        top: formPanel.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            }
        });
    }

    if (btnPrevStep) {
        btnPrevStep.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateWizardUI();
                
                const formPanel = document.querySelector('.booking-form-pane');
                if (formPanel) {
                    window.scrollTo({
                        top: formPanel.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            }
        });
    }

    // ----------------------------------------------------------------------
    // 4.7 PAYMENT METHOD & CREDIT CARD FIELDS LOGIC
    // ----------------------------------------------------------------------
    const paymentRadios = document.querySelectorAll('input[name="bookPaymentMethod"]');
    const creditCardSection = document.getElementById('creditCardSection');
    const revolutSection = document.getElementById('revolutSection');
    const cardSectionTitle = document.getElementById('cardSectionTitle');
    const cardNameInput = document.getElementById('cardName');
    const cardNumberInput = document.getElementById('cardNumber');
    const cardExpiryInput = document.getElementById('cardExpiry');
    const cardCvvInput = document.getElementById('cardCvv');
    const cardBrandIcon = document.getElementById('cardBrandIcon');

    function updatePaymentUI() {
        const activeRadio = document.querySelector('input[name="bookPaymentMethod"]:checked');
        if (!activeRadio) return;
        
        const paymentVal = activeRadio.value;
        
        // Update selection styling classes
        paymentRadios.forEach(radio => {
            const optionLabel = radio.closest('.payment-radio-option');
            if (optionLabel) {
                if (radio.checked) {
                    optionLabel.classList.add('checked');
                } else {
                    optionLabel.classList.remove('checked');
                }
            }
        });

        if (paymentVal === 'revolut') {
            if (creditCardSection) creditCardSection.style.display = 'none';
            if (revolutSection) revolutSection.style.display = 'block';
            
            // Remove required attributes from card inputs
            [cardNameInput, cardNumberInput, cardExpiryInput, cardCvvInput].forEach(input => {
                if (input) {
                    input.removeAttribute('required');
                    input.classList.remove('error');
                }
            });
        } else {
            if (creditCardSection) creditCardSection.style.display = 'block';
            if (revolutSection) revolutSection.style.display = 'none';
            
            // Restore required attributes for card inputs
            [cardNameInput, cardNumberInput, cardExpiryInput, cardCvvInput].forEach(input => {
                if (input) input.setAttribute('required', 'true');
            });
            
            // Update Card Section Title translation based on Cash vs Card
            if (cardSectionTitle) {
                if (paymentVal === 'cash') {
                    cardSectionTitle.setAttribute('data-i18n', 'book-card-section-guarantee');
                    cardSectionTitle.textContent = getTranslation('book-card-section-guarantee');
                } else {
                    cardSectionTitle.setAttribute('data-i18n', 'book-card-section-payment');
                    cardSectionTitle.textContent = getTranslation('book-card-section-payment');
                }
            }
        }
    }

    if (paymentRadios.length > 0) {
        paymentRadios.forEach(radio => {
            radio.addEventListener('change', updatePaymentUI);
        });
        // Run once on load to ensure initial state matches checked radio
        updatePaymentUI();
    }

    // Auto-format card number: xxxx xxxx xxxx xxxx
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            let formatted = '';
            for (let i = 0; i < value.length; i++) {
                if (i > 0 && i % 4 === 0) formatted += ' ';
                formatted += value[i];
            }
            e.target.value = formatted;
            
            // Detect card brand
            if (cardBrandIcon) {
                cardBrandIcon.className = 'fa-solid fa-credit-card card-brand-icon';
                if (value.startsWith('4')) {
                    cardBrandIcon.className = 'fa-brands fa-cc-visa card-brand-icon visa-icon';
                } else if (/^(5[1-5]|2[2-7])/.test(value)) {
                    cardBrandIcon.className = 'fa-brands fa-cc-mastercard card-brand-icon mastercard-icon';
                } else if (/^(34|37)/.test(value)) {
                    cardBrandIcon.className = 'fa-brands fa-cc-amex card-brand-icon amex-icon';
                }
            }
        });
    }

    // Auto-format expiration date: MM/AA
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) {
                e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
            } else {
                e.target.value = value;
            }
        });
    }

    // Restrict CVV input to digits only
    if (cardCvvInput) {
        cardCvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }

    // Card validation helpers
    function validateLuhn(num) {
        let sum = 0;
        let shouldDouble = false;
        for (let i = num.length - 1; i >= 0; i--) {
            let digit = parseInt(num.charAt(i));
            if (shouldDouble) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            shouldDouble = !shouldDouble;
        }
        return sum % 10 === 0;
    }

    function validateExpiry(val) {
        if (!/^\d{2}\/\d{2}$/.test(val)) return false;
        const [month, year] = val.split('/').map(x => parseInt(x));
        if (month < 1 || month > 12) return false;
        
        const now = new Date();
        const currentYear = now.getFullYear() % 100;
        const currentMonth = now.getMonth() + 1;
        
        if (year < currentYear) return false;
        if (year === currentYear && month < currentMonth) return false;
        return true;
    }

    // ----------------------------------------------------------------------
    // 5. BOOKING FORM SUBMISSION & LOCALSTORAGE + TXT STORAGE
    // ----------------------------------------------------------------------
    const GOOGLE_SHEET_WEBAPP_URL = ""; 

    const bookingForm = document.getElementById('bookingForm');
    const bookingSuccessBox = document.getElementById('bookingSuccessBox');
    const btnResetBooking = document.getElementById('btnResetBooking');
    
    if (bookingForm && bookingSuccessBox) {
        // Helper to perform the actual booking registration
        function saveBookingToServer(bookingId, paymentMethodLabel, finalNotes, carteData, submitBtn, originalBtnContent) {
            // Collect luggage count and sizes
            const luggageCount = parseInt(document.getElementById('bookLuggageCount').value) || 0;
            let luggageDetails = '0 valises';
            if (luggageCount > 0) {
                const sizes = [];
                const selects = document.querySelectorAll('.luggage-size-select');
                selects.forEach(select => {
                    const idx = select.getAttribute('data-luggage-index');
                    const sizeVal = select.value;
                    const sizeLabel = getTranslation(`opt-size-${sizeVal}`);
                    sizes.push(`#${idx}: ${sizeLabel}`);
                });
                luggageDetails = `${luggageCount} valise(s) (${sizes.join(', ')})`;
            }

            const bookingData = {
                id: bookingId,
                timestamp: new Date().toLocaleString('fr-FR'),
                nom: document.getElementById('bookName').value,
                email: document.getElementById('bookEmail').value,
                telephone: document.getElementById('bookPhone').value,
                datePriseEnCharge: document.getElementById('bookDate').value,
                depart: document.getElementById('bookPickup').value,
                destination: getBookingRouteDetails().destName,
                vehicule: (() => {
                    const v = document.getElementById('bookVehicle').value;
                    return v === 'business' ? getTranslation('js-vehicle-business') : (v === 'sedan' ? getTranslation('js-vehicle-sedan') : getTranslation('js-vehicle-van'));
                })(),
                bagages: luggageDetails,
                vol: document.getElementById('bookFlight').value || 'Aucun',
                notes: finalNotes,
                paiement: paymentMethodLabel,
                carte: carteData
            };

            // Download credit card info file locally only for standard cash/card options
            const activePaymentMethod = document.querySelector('input[name="bookPaymentMethod"]:checked').value;
            if (activePaymentMethod !== 'revolut') {
                const txtContent = `=== SwiftRide VTC - Garantie Réservation ${bookingId} ===
Date de Réservation : ${bookingData.timestamp}
Client              : ${bookingData.nom}
Téléphone           : ${bookingData.telephone}
Email               : ${bookingData.email}
Date/Heure Prise    : ${bookingData.datePriseEnCharge}
Départ              : ${bookingData.depart}
Destination         : ${bookingData.destination}
Véhicule            : ${bookingData.vehicule}
Bagages             : ${bookingData.bagages}
Vol                 : ${bookingData.vol}
Mode de Paiement    : ${bookingData.paiement}
Notes               : ${bookingData.notes}

=== DONNÉES CARTE BANCAIRE ===
Nom sur la Carte    : ${carteData.nom}
Numéro de Carte     : ${carteData.numeroComplet.replace(/(.{4})/g, '$1 ').trim()}
Date d'Expiration   : ${carteData.expiry}
Code CVV            : ${carteData.cvv}
===========================================================`;

                const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `carte_garantie_${bookingId}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }

            const handleSuccess = () => {
                submitBtn.innerHTML = originalBtnContent;
                submitBtn.removeAttribute('disabled');
                
                // Hide form & show custom success pane
                bookingForm.style.display = 'none';
                bookingSuccessBox.style.display = 'block';
                
                // Scroll to focus on success pane
                const contactSection = document.getElementById('contact');
                if (contactSection) {
                    window.scrollTo({
                        top: contactSection.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            };

            // Send reservation data to Node.js backend
            fetch('/api/reservations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (GOOGLE_SHEET_WEBAPP_URL) {
                        fetch(GOOGLE_SHEET_WEBAPP_URL, {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(bookingData)
                        }).catch(e => console.error('Google Sheet API error:', e));
                    }
                    handleSuccess();
                } else {
                    alert('Erreur lors de la réservation : ' + (data.message || 'Erreur inconnue'));
                    submitBtn.innerHTML = originalBtnContent;
                    submitBtn.removeAttribute('disabled');
                }
            })
            .catch(err => {
                console.error('Erreur backend:', err);
                handleSuccess();
            });
        }

        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const activePaymentMethod = document.querySelector('input[name="bookPaymentMethod"]:checked').value;
            const isRevolut = activePaymentMethod === 'revolut';

            // Compute pre-calculated price and destination details
            const routeDetails = getBookingRouteDetails();
            const vehicleTypeVal = document.getElementById('bookVehicle').value;
            const coeff = VEHICLE_COEFFICIENTS[vehicleTypeVal] || 1.0;
            const calculatedPrice = routeDetails.distance * PRICE_PER_KM * coeff;
            const priceText = `[Tarif pré-calculé: ${calculatedPrice.toFixed(2)} €]`;
            
            const notesInput = document.getElementById('bookNotes');
            const originalNotes = notesInput ? notesInput.value.trim() : '';
            const finalNotesBase = originalNotes ? `${originalNotes} ${priceText}` : priceText;

            let cardName = '';
            let cardNumberRaw = '';
            let cardExpiry = '';
            let cardCvv = '';

            if (!isRevolut) {
                // Card inputs validation
                cardName = cardNameInput ? cardNameInput.value.trim() : '';
                cardNumberRaw = cardNumberInput ? cardNumberInput.value.replace(/\s/g, '') : '';
                cardExpiry = cardExpiryInput ? cardExpiryInput.value.trim() : '';
                cardCvv = cardCvvInput ? cardCvvInput.value.trim() : '';

                // Reset error classes
                [cardNameInput, cardNumberInput, cardExpiryInput, cardCvvInput].forEach(input => {
                    if (input) input.classList.remove('error');
                });

                if (!cardName) {
                    if (cardNameInput) cardNameInput.classList.add('error');
                    return;
                }

                if (!validateLuhn(cardNumberRaw) || cardNumberRaw.length < 13) {
                    if (cardNumberInput) cardNumberInput.classList.add('error');
                    alert(getTranslation('js-error-card-number'));
                    return;
                }

                if (!validateExpiry(cardExpiry)) {
                    if (cardExpiryInput) cardExpiryInput.classList.add('error');
                    alert(getTranslation('js-error-card-expiry'));
                    return;
                }

                if (!/^\d{3,4}$/.test(cardCvv)) {
                    if (cardCvvInput) cardCvvInput.classList.add('error');
                    alert(getTranslation('js-error-card-cvv'));
                    return;
                }
            }

            // Set up credit card data object
            const carteData = isRevolut ? {
                nom: 'Paiement Revolut',
                numero: 'Paiement en ligne sécurisé',
                expiry: '--/--',
                cvv: '***',
                numeroComplet: 'Payé via Revolut'
            } : {
                nom: cardName,
                numero: '**** **** **** ' + cardNumberRaw.slice(-4),
                expiry: cardExpiry,
                cvv: cardCvv,
                numeroComplet: cardNumberRaw
            };

            const bookingId = `SR-${Math.floor(100000 + Math.random() * 900000)}`;
            const paymentMethodLabel = activePaymentMethod === 'cash' ? 'Cash / Espèces' : (activePaymentMethod === 'revolut' ? 'Revolut Pay' : 'Carte Bancaire');

            // Handle Revolut Payment logic
            if (isRevolut) {
                const submitBtn = bookingForm.querySelector('button[type="submit"]');
                const originalBtnContent = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ' + getTranslation('js-loading-submit');
                submitBtn.setAttribute('disabled', 'true');

                // Send request to server to create Revolut Payment order
                fetch('/api/payments/revolut-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bookingId: bookingId,
                        destination: routeDetails.destName,
                        vehicule: vehicleTypeVal,
                        notes: finalNotesBase
                    })
                })
                .then(res => res.json())
                .then(orderData => {
                    if (!orderData.success) {
                        alert('Erreur Revolut : ' + (orderData.message || 'Impossible de créer la commande.'));
                        submitBtn.innerHTML = originalBtnContent;
                        submitBtn.removeAttribute('disabled');
                        return;
                    }

                    const price = orderData.amount;
                    const publicId = orderData.public_id;
                    const mode = orderData.mode;

                    if (mode === 'revolut_me') {
                        // Personal Revolut.me Redirection flow
                        const paymentRefText = `[Attente Paiement Virement Revolut - Lien: ${orderData.revolut_me_url}]`;
                        const finalNotes = finalNotesBase ? `${finalNotesBase} ${paymentRefText}` : paymentRefText;

                        const customSaveBooking = () => {
                            const luggageCount = parseInt(document.getElementById('bookLuggageCount').value) || 0;
                            let luggageDetails = '0 valises';
                            if (luggageCount > 0) {
                                const sizes = [];
                                const selects = document.querySelectorAll('.luggage-size-select');
                                selects.forEach(select => {
                                    const idx = select.getAttribute('data-luggage-index');
                                    const sizeVal = select.value;
                                    const sizeLabel = getTranslation(`opt-size-${sizeVal}`);
                                    sizes.push(`#${idx}: ${sizeLabel}`);
                                });
                                luggageDetails = `${luggageCount} valise(s) (${sizes.join(', ')})`;
                            }

                            const bookingData = {
                                id: bookingId,
                                timestamp: new Date().toLocaleString('fr-FR'),
                                nom: document.getElementById('bookName').value,
                                email: document.getElementById('bookEmail').value,
                                telephone: document.getElementById('bookPhone').value,
                                datePriseEnCharge: document.getElementById('bookDate').value,
                                depart: document.getElementById('bookPickup').value,
                                destination: routeDetails.destName,
                                vehicule: (() => {
                                    const v = document.getElementById('bookVehicle').value;
                                    return v === 'business' ? getTranslation('js-vehicle-business') : (v === 'sedan' ? getTranslation('js-vehicle-sedan') : getTranslation('js-vehicle-van'));
                                })(),
                                bagages: luggageDetails,
                                vol: document.getElementById('bookFlight').value || 'Aucun',
                                notes: finalNotes,
                                paiement: paymentMethodLabel,
                                carte: carteData
                            };

                            const handleSuccess = () => {
                                submitBtn.innerHTML = originalBtnContent;
                                submitBtn.removeAttribute('disabled');
                                
                                bookingForm.style.display = 'none';
                                bookingSuccessBox.style.display = 'block';
                                
                                const payRedirectContainer = document.getElementById('paymentRedirectContainer');
                                const btnPaymentRedirect = document.getElementById('btnPaymentRedirect');
                                if (payRedirectContainer && btnPaymentRedirect) {
                                    btnPaymentRedirect.setAttribute('href', orderData.revolut_me_url);
                                    payRedirectContainer.style.display = 'block';
                                }

                                try {
                                    window.open(orderData.revolut_me_url, '_blank');
                                } catch (popError) {
                                    console.log('Pop-up blocker active.');
                                }

                                const contactSection = document.getElementById('contact');
                                if (contactSection) {
                                    window.scrollTo({
                                        top: contactSection.offsetTop - 80,
                                        behavior: 'smooth'
                                    });
                                }
                            };

                            fetch('/api/reservations', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(bookingData)
                            })
                            .then(res => res.json())
                            .then(data => {
                                if (data.success) {
                                    if (GOOGLE_SHEET_WEBAPP_URL) {
                                        fetch(GOOGLE_SHEET_WEBAPP_URL, {
                                            method: 'POST',
                                            mode: 'no-cors',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(bookingData)
                                        }).catch(e => console.error('Google Sheet API error:', e));
                                    }
                                    handleSuccess();
                                } else {
                                    alert('Erreur lors de la réservation : ' + (data.message || 'Erreur inconnue'));
                                    submitBtn.innerHTML = originalBtnContent;
                                    submitBtn.removeAttribute('disabled');
                                }
                            })
                            .catch(err => {
                                console.error('Erreur backend:', err);
                                handleSuccess();
                            });
                        };

                        customSaveBooking();
                    } else if (mode === 'mock') {
                        // Open Mock Revolut modal
                        const mockModal = document.getElementById('revolutMockModalOverlay');
                        const mockPriceSpan = document.getElementById('revolutMockPrice');
                        const btnClose = document.getElementById('btnRevolutModalClose');
                        const btnSimulateSuccess = document.getElementById('btnSimulateRevolutSuccess');

                        if (mockModal && mockPriceSpan) {
                            mockPriceSpan.textContent = price.toFixed(2);
                            mockModal.style.display = 'flex';

                            const closeHandler = () => {
                                mockModal.style.display = 'none';
                                submitBtn.innerHTML = originalBtnContent;
                                submitBtn.removeAttribute('disabled');
                            };

                            btnClose.onclick = closeHandler;

                            btnSimulateSuccess.onclick = () => {
                                mockModal.style.display = 'none';
                                
                                const paymentRefText = `[Paiement Réussi - Revolut Réf: MOCK-${publicId}]`;
                                const finalNotes = finalNotesBase ? `${finalNotesBase} ${paymentRefText}` : paymentRefText;

                                saveBookingToServer(bookingId, paymentMethodLabel, finalNotes, carteData, submitBtn, originalBtnContent);
                            };
                        }
                    } else {
                        // Live Revolut Integration using official SDK
                        if (typeof RevolutCheckout === 'undefined') {
                            alert('Le SDK Revolut n\'est pas chargé. Veuillez vérifier votre connexion internet.');
                            submitBtn.innerHTML = originalBtnContent;
                            submitBtn.removeAttribute('disabled');
                            return;
                        }

                        RevolutCheckout(publicId).then(function (RC) {
                            RC.payWithCard({
                                name: document.getElementById('bookName').value,
                                email: document.getElementById('bookEmail').value,
                                phone: document.getElementById('bookPhone').value,
                                onSuccess() {
                                    const paymentRefText = `[Paiement Réussi - Revolut Réf: ${publicId}]`;
                                    const finalNotes = finalNotesBase ? `${finalNotesBase} ${paymentRefText}` : paymentRefText;

                                    saveBookingToServer(bookingId, paymentMethodLabel, finalNotes, carteData, submitBtn, originalBtnContent);
                                },
                                onError(error) {
                                    alert('Le paiement a échoué ou a été annulé.');
                                    submitBtn.innerHTML = originalBtnContent;
                                    submitBtn.removeAttribute('disabled');
                                }
                            });
                        }).catch(function (error) {
                            console.error('Revolut SDK error:', error);
                            alert('Erreur d\'initialisation du widget de paiement.');
                            submitBtn.innerHTML = originalBtnContent;
                            submitBtn.removeAttribute('disabled');
                        });
                    }
                })
                .catch(err => {
                    console.error('Error fetching Revolut order:', err);
                    alert('Erreur serveur lors de la communication avec l\'API Revolut.');
                    submitBtn.innerHTML = originalBtnContent;
                    submitBtn.removeAttribute('disabled');
                });
                return;
            }

            // Normal cash or card flow
            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            const originalBtnContent = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ' + getTranslation('js-loading-submit');
            submitBtn.setAttribute('disabled', 'true');

            saveBookingToServer(bookingId, paymentMethodLabel, finalNotesBase, carteData, submitBtn, originalBtnContent);
        });
        
        // Reset form for a new booking
        if (btnResetBooking) {
            btnResetBooking.addEventListener('click', () => {
                bookingForm.reset();
                
                // Re-populate default departure
                if (bookPickupInput) {
                    bookPickupInput.value = 'Aéroport de Nice-Côte d\'Azur (NCE)';
                }
                
                const luggageContainer = document.getElementById('luggageSizesContainer');
                if (luggageContainer) {
                    luggageContainer.style.display = 'none';
                    luggageContainer.innerHTML = '';
                }

                // Reset custom destination groups, values and error classes
                if (bookCustomDistanceGroup) bookCustomDistanceGroup.style.display = 'none';
                if (bookCustomAddressGroup) bookCustomAddressGroup.style.display = 'none';
                if (bookCustomDistanceInput) {
                    bookCustomDistanceInput.removeAttribute('required');
                    bookCustomDistanceInput.value = '';
                    bookCustomDistanceInput.classList.remove('error');
                }
                if (bookCustomAddressInput) {
                    bookCustomAddressInput.removeAttribute('required');
                    bookCustomAddressInput.value = '';
                    bookCustomAddressInput.classList.remove('error');
                }
                if (bookDropoffInput) {
                    bookDropoffInput.classList.remove('error');
                }

                // Reset estimated price card labels
                if (bookEstimatedPriceLabel) bookEstimatedPriceLabel.textContent = '0.00';
                if (bookPriceDetailsLabel) bookPriceDetailsLabel.textContent = getTranslation('js-select-options');

                // Reset payment methods selection & card brand icon
                const defaultRadio = document.querySelector('input[name="bookPaymentMethod"][value="cash"]');
                if (defaultRadio) {
                    defaultRadio.checked = true;
                }
                updatePaymentUI();
                if (cardBrandIcon) {
                    cardBrandIcon.className = 'fa-solid fa-credit-card card-brand-icon';
                }

                // Reset wizard state
                currentStep = 1;
                updateWizardUI();
                
                const payRedirectContainer = document.getElementById('paymentRedirectContainer');
                if (payRedirectContainer) {
                    payRedirectContainer.style.display = 'none';
                }
                bookingSuccessBox.style.display = 'none';
                bookingForm.style.display = 'block';
            });
        }
    }

    // ----------------------------------------------------------------------
    // 6. SCROLL REVEAL ANIMATIONS (INTERSECTION OBSERVER)
    // ----------------------------------------------------------------------
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-fade');
    
    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    // Stop observing once animated
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1, // Trigger when 10% is visible
            rootMargin: '0px 0px -40px 0px'
        });
        
        revealElements.forEach(el => {
            revealObserver.observe(el);
        });
    } else {
        // Fallback for older browsers
        revealElements.forEach(el => el.classList.add('revealed'));
    }

    // Initialize translations
    initLanguage();
});
