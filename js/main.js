/* ============================================
   INVITACION DE BODA - LOGICA UI Y ANIMACIONES
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    const CONFIG = window.APP_CONFIG || {};
    const uiConfig = CONFIG.ui || {};
    const safeDefaultName = uiConfig.nombreDefault || '[Nombre del Invitado]';
    const safeDefaultPasses = Number.isInteger(uiConfig.pasesDefault) ? uiConfig.pasesDefault : 1;
    const safeAbsoluteMax = Number.isInteger(uiConfig.maxPasesAbsoluto) ? uiConfig.maxPasesAbsoluto : 10;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const sobre = document.getElementById('sobre');
    const selloCera = document.getElementById('sello-cera');
    const sobreHint = document.querySelector('.sobre-hint');
    const sobreSection = document.getElementById('sobre-section');
    const invitacionSection = document.getElementById('invitacion-section');
    const guestStatus = document.getElementById('guest-status');
    const guestStatusText = document.getElementById('guest-status-text');
    const countdownTime = document.getElementById('countdown-tiempo');
    const countdownTitle = document.querySelector('.countdown-titulo');
    const cdDias = document.getElementById('cd-dias');
    const cdHoras = document.getElementById('cd-horas');
    const cdMinutos = document.getElementById('cd-minutos');
    const cdSegundos = document.getElementById('cd-segundos');
    const fechaDiaSemana = document.querySelector('.fecha-dia-semana');
    const fechaDia = document.querySelector('.fecha-dia');
    const fechaMes = document.querySelector('.fecha-mes');
    const fechaAno = document.querySelector('.fecha-año');
    const ceremoniaHora = document.getElementById('ceremonia-hora');
    const recepcionHora = document.getElementById('recepcion-hora');
    const abrirMapaBtn = document.getElementById('abrir-mapa');
    const musicFab = document.getElementById('music-fab');
    const musicaBoda = document.getElementById('musica-boda');
    const musicUploadInput = document.getElementById('music-upload');

    const nombreCarta = document.getElementById('nombre-invitado');
    const pasesCarta = document.getElementById('cantidad-pases');
    const maxPasesLabel = document.getElementById('max-pases');
    const codigoInput = document.getElementById('rsvp-codigo');
    const cantidadInput = document.getElementById('rsvp-cantidad');
    const nombresLineasContainer = document.getElementById('rsvp-nombres-lineas');

    const radiosAsistencia = document.querySelectorAll('input[name="asistencia"]');
    const grupoCantidad = document.getElementById('grupo-cantidad');
    const grupoNombres = document.getElementById('grupo-nombres');
    const btnMenos = document.getElementById('btn-menos');
    const btnMas = document.getElementById('btn-mas');
    const rsvpForm = document.getElementById('rsvp-form');
    const rsvpBoton = document.getElementById('rsvp-boton');

    let sobreAbierto = false;
    let envelopeReady = false;
    let envelopeCanOpen = false;
    let currentGuest = {
        codigo: '',
        nombre: safeDefaultName,
        pasesAutorizados: safeDefaultPasses,
        valido: false
    };

    function hasMultiplePasses() {
        return clampPasses(currentGuest.pasesAutorizados) > 1;
    }

    function clampPasses(value) {
        const parsed = parseInt(String(value), 10);
        if (!Number.isFinite(parsed) || parsed < 1) return 1;
        return Math.min(parsed, safeAbsoluteMax);
    }

    function formatCountdownValue(value) {
        return String(value).padStart(2, '0');
    }

    function formatTimeLabel(targetDate) {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(targetDate);
    }

    function syncEventDateDisplay(targetDate) {
        if (!targetDate || Number.isNaN(targetDate.getTime())) return;

        const parts = new Intl.DateTimeFormat('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).formatToParts(targetDate).reduce(function (acc, part) {
            acc[part.type] = part.value;
            return acc;
        }, {});

        if (fechaDiaSemana && parts.weekday) {
            fechaDiaSemana.textContent = parts.weekday.charAt(0).toUpperCase() + parts.weekday.slice(1);
        }
        if (fechaDia && parts.day) {
            fechaDia.textContent = parts.day;
        }
        if (fechaMes && parts.month) {
            fechaMes.textContent = parts.month.charAt(0).toUpperCase() + parts.month.slice(1);
        }
        if (fechaAno && parts.year) {
            fechaAno.textContent = parts.year;
        }
        if (ceremoniaHora) {
            ceremoniaHora.textContent = formatTimeLabel(targetDate);
        }
        if (recepcionHora && typeof uiConfig.receptionTimeLabel === 'string' && uiConfig.receptionTimeLabel.trim()) {
            recepcionHora.textContent = uiConfig.receptionTimeLabel.trim();
        }
    }

    function setupCountdown() {
        if (!countdownTime) return;

        const ceremonyDateIso = String(uiConfig.ceremonyDateIso || uiConfig.eventDateIso || '').trim();
        const targetDate = ceremonyDateIso ? new Date(ceremonyDateIso) : null;

        if (!targetDate || Number.isNaN(targetDate.getTime())) {
            [cdDias, cdHoras, cdMinutos, cdSegundos].forEach(function (el) {
                if (el) el.textContent = '--';
            });
            return;
        }

        syncEventDateDisplay(targetDate);

        const updateCountdown = function () {
            const now = new Date();
            const diffMs = targetDate.getTime() - now.getTime();

            if (diffMs <= 0) {
                if (countdownTitle) {
                    countdownTitle.textContent = '¡Hoy es el gran día!';
                }
                [cdDias, cdHoras, cdMinutos, cdSegundos].forEach(function (el) {
                    if (el) el.textContent = '00';
                });
                return;
            }

            if (countdownTitle) {
                countdownTitle.textContent = 'El gran dia empieza en';
            }

            const totalSeconds = Math.floor(diffMs / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            if (cdDias) cdDias.textContent = formatCountdownValue(days);
            if (cdHoras) cdHoras.textContent = formatCountdownValue(hours);
            if (cdMinutos) cdMinutos.textContent = formatCountdownValue(minutes);
            if (cdSegundos) cdSegundos.textContent = formatCountdownValue(seconds);
        };

        updateCountdown();
        window.setInterval(updateCountdown, 1000);
    }

    function setGuestStatus(message, variant) {
        if (!guestStatus || !guestStatusText) return;
        guestStatus.classList.remove('status-loading', 'status-ok', 'status-error');
        if (variant) {
            guestStatus.classList.add('status-' + variant);
        }
        guestStatusText.textContent = message;
    }

    function setEnvelopeState(ready, canOpen, message) {
        envelopeReady = Boolean(ready);
        envelopeCanOpen = Boolean(canOpen);

        if (sobreSection) {
            sobreSection.classList.toggle('loading-state', !envelopeReady);
        }

        if (!sobre) return;

        sobre.classList.toggle('sobre-bloqueado', !envelopeCanOpen);
        if (sobreHint && message) {
            sobreHint.textContent = message;
        }
    }

    function setRsvpEnabled(enabled) {
        if (!rsvpForm) return;
        const controls = rsvpForm.querySelectorAll('input, textarea, button');
        controls.forEach((control) => {
            if (control.id === 'rsvp-codigo') return;
            control.disabled = !enabled;
        });
        if (rsvpBoton) {
            rsvpBoton.disabled = !enabled;
        }
    }

    function updatePassesUI(maxPasses) {
        const limited = clampPasses(maxPasses);
        pasesCarta.textContent = String(limited);
        maxPasesLabel.textContent = String(limited);
        cantidadInput.max = String(limited);
        if (limited <= 1) {
            cantidadInput.value = '1';
        }
        if (parseInt(cantidadInput.value, 10) > limited) {
            cantidadInput.value = String(limited);
        }
    }

    function clearCompanionNameInputs() {
        if (!nombresLineasContainer) return;
        nombresLineasContainer.innerHTML = '';
    }

    function renderCompanionNameInputs() {
        if (!nombresLineasContainer) return;

        const count = parseInt(cantidadInput.value, 10) || 1;
        const namesToKeep = [];
        nombresLineasContainer.querySelectorAll('input').forEach(function (input) {
            namesToKeep.push((input.value || '').trim());
        });

        nombresLineasContainer.innerHTML = '';

        for (let i = 0; i < count; i += 1) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'nombre-asistente-input';
            input.id = 'rsvp-asistente-' + (i + 1);
            input.name = 'asistente_' + (i + 1);
            input.autocomplete = 'off';
            const isMainGuestLine = i === 0;
            input.placeholder = isMainGuestLine ? 'Nombre del invitado principal' : 'Nombre del asistente ' + (i + 1);
            input.value = namesToKeep[i] || (isMainGuestLine ? currentGuest.nombre : '');
            nombresLineasContainer.appendChild(input);
        }
    }

    function getCompanionNamesCSV() {
        if (!nombresLineasContainer) return '';
        const names = [];
        nombresLineasContainer.querySelectorAll('input').forEach(function (input) {
            const value = (input.value || '').trim();
            if (value) {
                names.push(value);
            }
        });
        return names.join(', ');
    }

    function toggleAttendanceFields(asistencia) {
        const hideByAttendance = (uiConfig.ocultarCamposSiNoAsiste !== false) && asistencia === 'no';
        const hideByPasses = !hasMultiplePasses();
        const hiddenClass = 'hidden';

        if (grupoCantidad) {
            grupoCantidad.classList.toggle(hiddenClass, hideByAttendance || hideByPasses);
        }

        if (grupoNombres) {
            grupoNombres.classList.toggle(hiddenClass, hideByAttendance || hideByPasses);
        }

        if (hideByAttendance || hideByPasses) {
            cantidadInput.value = '1';
            clearCompanionNameInputs();
            return;
        }

        renderCompanionNameInputs();
    }

    function applyGuestContext(data) {
        const guestName = data && data.nombre ? data.nombre : safeDefaultName;
        const guestCode = data && data.codigo ? String(data.codigo) : '';
        const passes = data && data.pasesAutorizados ? data.pasesAutorizados : safeDefaultPasses;
        const isValid = Boolean(data && data.valido);

        currentGuest = {
            codigo: guestCode,
            nombre: guestName,
            pasesAutorizados: clampPasses(passes),
            valido: isValid
        };

        nombreCarta.textContent = currentGuest.nombre;
        codigoInput.value = currentGuest.codigo;

        if (isValid) {
            updatePassesUI(currentGuest.pasesAutorizados);
            const selectedAttendance = document.querySelector('input[name="asistencia"]:checked');
            toggleAttendanceFields(selectedAttendance ? selectedAttendance.value : 'si');
            setGuestStatus('Invitacion validada.', 'ok');
            setRsvpEnabled(true);
        } else {
            updatePassesUI(safeDefaultPasses);
            toggleAttendanceFields('no');
            setGuestStatus('Codigo invalido o inactivo. No es posible confirmar asistencia.', 'error');
            setRsvpEnabled(false);
        }
    }

    function openInvitation() {
        if (!envelopeReady) {
            if (sobreHint) {
                sobreHint.textContent = 'Validando invitacion, espera un momento...';
            }
            return;
        }

        if (!envelopeCanOpen) {
            if (sobreHint) {
                sobreHint.textContent = 'No se pudo validar tu codigo. Revisa el enlace.';
            }
            return;
        }

        if (sobreAbierto) return;
        sobreAbierto = true;
        sobre.classList.add('abierto');

        const revealContent = function () {
            sobreSection.classList.add('hidden');
            invitacionSection.classList.remove('hidden');
            invitacionSection.style.opacity = '1';
            invitacionSection.style.transform = 'translateY(0)';
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
            if (!reduceMotion) {
                launchConfetti();
            }
        };

        if (reduceMotion) {
            revealContent();
            return;
        }

        // Dejar visible la apertura completa antes de cambiar a la invitacion.
        setTimeout(function () {
            sobreSection.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
            sobreSection.style.opacity = '0';
            sobreSection.style.transform = 'scale(0.9)';
            setTimeout(revealContent, 380);
        }, 1250);
    }

    function launchConfetti() {
        const container = document.getElementById('confetti-container');
        const colors = ['#9CAF88', '#E2725B', '#D4A574', '#F5F0E8', '#B8C9A6', '#E8947A'];
        if (!container) return;

        for (let i = 0; i < 60; i += 1) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.width = 4 + Math.random() * 8 + 'px';
            confetti.style.height = 4 + Math.random() * 8 + 'px';
            container.appendChild(confetti);
            setTimeout(function () {
                confetti.remove();
            }, 5000);
        }
    }

    function setupQuantitySelector() {
        if (!btnMenos || !btnMas || !cantidadInput) return;

        btnMenos.addEventListener('click', function () {
            const current = parseInt(cantidadInput.value, 10) || 1;
            if (current > 1) {
                cantidadInput.value = String(current - 1);
                renderCompanionNameInputs();
            }
        });

        btnMas.addEventListener('click', function () {
            const current = parseInt(cantidadInput.value, 10) || 1;
            const max = parseInt(cantidadInput.max, 10) || safeAbsoluteMax;
            if (current < max) {
                cantidadInput.value = String(current + 1);
                renderCompanionNameInputs();
            }
        });
    }

    function setupAttendanceToggle() {
        radiosAsistencia.forEach(function (radio) {
            radio.addEventListener('change', function () {
                toggleAttendanceFields(this.value);
            });
        });
    }

    function setupRevealAnimation() {
        if (reduceMotion || !('IntersectionObserver' in window)) return;
        const observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        };

        const revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    revealObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.seccion-portada, .seccion-padres, .seccion-fecha, .seccion-fotos, .seccion-itinerario, .seccion-dresscode, .seccion-regalos, .seccion-rsvp').forEach(function (section) {
            section.style.opacity = '0';
            section.style.transform = 'translateY(30px)';
            section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            revealObserver.observe(section);
        });
    }

    function setupParallax() {
        if (reduceMotion) return;
        let ticking = false;
        window.addEventListener('scroll', function () {
            if (ticking) return;
            window.requestAnimationFrame(function () {
                const scrollY = window.scrollY;
                const header = document.querySelector('.invitacion-header');
                if (header && scrollY < 500) {
                    header.style.backgroundPositionY = scrollY * 0.3 + 'px';
                }
                ticking = false;
            });
            ticking = true;
        });
    }

    function setupMapButton() {
        if (!abrirMapaBtn) return;

        const mapsConfig = uiConfig.maps || {};
        const lat = Number(mapsConfig.lat);
        const lng = Number(mapsConfig.lng);
        const zoom = Number.isFinite(Number(mapsConfig.zoom)) ? Number(mapsConfig.zoom) : 17;

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            abrirMapaBtn.disabled = true;
            abrirMapaBtn.setAttribute('aria-disabled', 'true');
            abrirMapaBtn.title = 'Faltan coordenadas validas en la configuracion.';
            return;
        }

        const mapsUrl = 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng) + '&z=' + encodeURIComponent(String(zoom));
        const isMobileDevice = window.matchMedia('(max-width: 768px)').matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

        abrirMapaBtn.addEventListener('click', function () {
            // En moviles, abrir en la misma pestana evita dejar una ventana en blanco
            // cuando el sistema redirige la URL hacia la app de Google Maps.
            if (isMobileDevice) {
                window.location.assign(mapsUrl);
                return;
            }

            const popup = window.open(
                mapsUrl,
                'googleMapsPopup',
                'popup=yes,width=980,height=720,left=80,top=60,resizable=yes,scrollbars=yes'
            );

            if (!popup) {
                window.location.href = mapsUrl;
            }
        });
    }

    function setupMusicPlayer() {
        if (!musicFab || !musicaBoda) return;

        const musicUrl = String(uiConfig.musicUrl || '').trim();
        const source = musicaBoda.querySelector('source');
        let uploadedObjectUrl = '';

        function hasLoadedTrack() {
            return Boolean(musicaBoda.currentSrc || musicaBoda.src);
        }

        function applyTrackUrl(url) {
            if (source) {
                source.src = url;
                musicaBoda.removeAttribute('src');
            } else {
                musicaBoda.src = url;
            }
            musicaBoda.load();
        }

        function setPlayingState(isPlaying) {
            musicFab.classList.toggle('is-playing', isPlaying);
            musicFab.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
            musicFab.setAttribute('aria-label', isPlaying ? 'Pausar cancion' : 'Reproducir cancion');
        }

        if (musicUrl) {
            applyTrackUrl(musicUrl);
            musicFab.title = 'Reproducir o pausar cancion';
        } else if (musicUploadInput) {
            musicFab.title = 'Sube una cancion desde tu dispositivo';
            musicFab.setAttribute('aria-label', 'Subir cancion');
        } else {
            musicFab.disabled = true;
            musicFab.classList.add('is-disabled');
            musicFab.title = 'Configura ui.musicUrl en js/config.js para activar la musica.';
            return;
        }

        musicFab.addEventListener('click', async function () {
            if (!hasLoadedTrack()) {
                if (musicUploadInput) {
                    musicUploadInput.click();
                }
                return;
            }

            try {
                if (musicaBoda.paused) {
                    await musicaBoda.play();
                    setPlayingState(true);
                } else {
                    musicaBoda.pause();
                    setPlayingState(false);
                }
            } catch (error) {
                setPlayingState(false);
                console.warn('No se pudo iniciar la musica automaticamente.', error);
            }
        });

        if (musicUploadInput) {
            musicUploadInput.addEventListener('change', async function () {
                const file = this.files && this.files[0];
                if (!file) return;

                if (uploadedObjectUrl) {
                    URL.revokeObjectURL(uploadedObjectUrl);
                }

                uploadedObjectUrl = URL.createObjectURL(file);
                applyTrackUrl(uploadedObjectUrl);

                try {
                    await musicaBoda.play();
                    setPlayingState(true);
                } catch (error) {
                    setPlayingState(false);
                    console.warn('No se pudo reproducir la cancion cargada.', error);
                }
            });
        }

        musicaBoda.addEventListener('pause', function () {
            setPlayingState(false);
        });

        musicaBoda.addEventListener('play', function () {
            setPlayingState(true);
        });

        setPlayingState(false);
    }

    window.InvitationUI = {
        applyGuestContext: applyGuestContext,
        setGuestStatus: setGuestStatus,
        setRsvpEnabled: setRsvpEnabled,
        toggleAttendanceFields: toggleAttendanceFields,
        getCompanionNamesCSV: getCompanionNamesCSV,
        setEnvelopeState: setEnvelopeState,
        getCurrentGuest: function () {
            return { ...currentGuest };
        }
    };

    nombreCarta.textContent = 'Validando invitado...';
    pasesCarta.textContent = '...';
    maxPasesLabel.textContent = '...';

    updatePassesUI(safeDefaultPasses);
    setGuestStatus('Validando invitacion...', 'loading');
    setRsvpEnabled(false);
    setEnvelopeState(false, false, 'Validando invitacion...');

    setupQuantitySelector();
    setupAttendanceToggle();
    setupCountdown();
    setupMapButton();
    setupMusicPlayer();
    setupRevealAnimation();
    setupParallax();

    if (selloCera) selloCera.addEventListener('click', openInvitation);

    console.log('Invitacion cargada. Esperando validacion por codigo unico.');
});
