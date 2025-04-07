/**
 * Визуализация трендов в кино
 * Основной JavaScript файл
 */

// Ждем загрузки DOM перед выполнением скриптов
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем анимации
    startAnimations();
    
    // Добавляем обработчик прокрутки для анимаций при скролле
    window.addEventListener('scroll', handleScroll);
    
    // Инициализируем физику
    initPhysics();

    // Инициализируем графики
    initCharts();
});

/**
 * Запускает начальные анимации элементов
 */
function startAnimations() {
    // Remove title and description animations
    // The code below replaces the previous animation code for these elements
    
    // Анимируем блок методологии при появлении в поле зрения
    const methodSection = document.querySelector('.method-content');
    methodSection.style.animation = 'fadeIn 1.5s forwards 1s';
    
    // Настраиваем начальное состояние статистики для последующей анимации
    const statsHeader = document.querySelector('.stats-header');
    statsHeader.style.animation = 'fadeIn 1.5s forwards 1s';
}

/**
 * Обрабатывает события прокрутки страницы
 */
function handleScroll() {
    // Анимируем элементы методологии при прокрутке
    animateOnScroll('.method-item', 'slideInLeft', 150);
    animateOnScroll('.scrap-text', 'slideInLeft', 0);
    
    // Анимируем кружки в секции статистики
    animateOnScroll('.circle', 'growCircle', 300);
    
    // Анимируем столбцы диаграммы
    animateChartBars();
    
    // Анимируем секцию временного интервала
    animateQuasarEffect();
    
    // Анимируем фильтры с эффектом зачеркивания
    animateFilters();
    
    // Add visualization sections animation
    const vizSections = document.querySelectorAll('.visualization-section');
    vizSections.forEach(section => {
        if (isInViewport(section) && !section.classList.contains('animated')) {
            section.classList.add('animated');
            const chart = section.querySelector('canvas');
            if (chart) {
                chart.style.opacity = '0';
                setTimeout(() => {
                    chart.style.transition = 'opacity 0.8s ease';
                    chart.style.opacity = '1';
                }, 300);
            }
            
            const insight = section.querySelector('.insight-box');
            if (insight) {
                insight.style.opacity = '0';
                insight.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    insight.style.transition = 'all 0.8s ease';
                    insight.style.opacity = '1';
                    insight.style.transform = 'translateY(0)';
                }, 600);
            }
        }
    });
}

/**
 * Анимирует эффект квазара при прокрутке
 */
function animateQuasarEffect() {
    const yearsContainer = document.querySelector('.years-container');
    const staticLine = document.getElementById('static-line');
    const rotatingLine = document.getElementById('rotating-line');
    const quasarFill = document.getElementById('quasar-fill');
    const quasarMaskPath = document.getElementById('quasar-mask-path');
    
    if (isInViewport(yearsContainer) && !yearsContainer.classList.contains('animated')) {
        // Добавляем класс для запуска CSS-анимаций
        yearsContainer.classList.add('animated');
        
        // Начальное положение линий
        const startY = 250;
        const svgWidth = 1000;
        
        // Initial state - both lines horizontal
        let currentAngle = 0;
        const targetAngle = 40; // Maximum rotation angle
        const duration = 1000; // Animation duration in ms
        const startTime = Date.now();
        
        // Функция обновления заливки между линиями
        function updateQuasarFill() {
            // Calculate progress (0 to 1)
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Calculate current angle based on progress (easing function)
            const easedProgress = easeOutQuad(progress);
            currentAngle = easedProgress * targetAngle;
            
            // If animation is complete, stop requesting frames
            if (progress >= 1) {
                // Set final state and don't request another frame
                const finalAngle = targetAngle;
                const rotatingYLeft = startY + svgWidth * Math.tan(finalAngle * Math.PI / 180) / 2;
                const rotatingYRight = startY - svgWidth * Math.tan(finalAngle * Math.PI / 180) / 2;
                updateQuasarPath(startY, rotatingYLeft, rotatingYRight, svgWidth);
                return;
            }
            
            // Calculate y-positions based on angle - REVERSED DIRECTION
            const rotatingYLeft = startY + svgWidth * Math.tan(currentAngle * Math.PI / 180) / 2;
            const rotatingYRight = startY - svgWidth * Math.tan(currentAngle * Math.PI / 180) / 2;
            
            // Update path connections
            updateQuasarPath(startY, rotatingYLeft, rotatingYRight, svgWidth);
            
            // Continue animation until complete
            requestAnimationFrame(updateQuasarFill);
        }
        
        // Helper function to update path
        function updateQuasarPath(staticY, rotatingYLeft, rotatingYRight, width) {
            // Update rotating line position - left endpoint down, right endpoint up
            rotatingLine.setAttribute('y1', rotatingYLeft);
            rotatingLine.setAttribute('y2', rotatingYRight);
            
            // Create a proper closed polygon path
            const pathData = `M0,${rotatingYLeft} L${width},${rotatingYRight} L${width},${staticY} L0,${staticY} Z`;
            
            // Update both the fill and mask
            quasarFill.setAttribute('d', pathData);
            if (quasarMaskPath) {
                quasarMaskPath.setAttribute('d', pathData);
            }
        }
        
        // Easing function for smoother animation
        function easeOutQuad(t) {
            return t * (2 - t);
        }
        
        // Запускаем анимацию
        updateQuasarFill();
    }
}

/**
 * Анимирует элементы при их появлении в поле зрения
 * @param {string} selector - CSS селектор элементов
 * @param {string} animationName - Название анимации из CSS
 * @param {number} stagger - Задержка между анимациями последовательных элементов (мс)
 */
function animateOnScroll(selector, animationName, stagger = 0) {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach((element, index) => {
        if (isInViewport(element) && !element.classList.contains('animated')) {
            setTimeout(() => {
                element.style.animation = `${animationName} 1s forwards`;
                element.classList.add('animated');
            }, index * stagger);
        }
    });
}

/**
 * Анимирует столбцы диаграммы
 */
function animateChartBars() {
    const chartContainer = document.querySelector('.chart-container');
    if (!isInViewport(chartContainer)) return;
    
    const bars = document.querySelectorAll('.bar');
    
    bars.forEach((bar, index) => {
        if (!bar.classList.contains('animated')) {
            // Получаем целевую высоту из стилей
            const targetHeight = bar.style.height;
            
            // Устанавливаем переменную CSS для анимации
            bar.style.setProperty('--final-height', targetHeight);
            
            // Запускаем анимацию с задержкой
            setTimeout(() => {
                bar.style.animation = 'growBar 1.5s forwards';
                bar.classList.add('animated');
            }, index * 100);
        }
    });
}

/**
 * Анимирует зачеркивание фильтров при прокрутке
 */
function animateFilters() {
    const filterItems = document.querySelectorAll('.filter-item');
    
    filterItems.forEach((item, index) => {
        // Check if element is in viewport and not yet animated
        if (isInViewport(item) && !item.classList.contains('animated')) {
            // Add a delay between each filter animation
            setTimeout(() => {
                item.classList.add('animated');
            }, index * 300); // 300ms delay between each item
        }
    });
}

/**
 * Проверяет, находится ли элемент в поле зрения
 * @param {Element} element - DOM элемент для проверки
 * @returns {boolean} - true, если элемент виден
 */
function isInViewport(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    
    // Consider element in viewport if its top is in the bottom 80% of the screen
    // or if its bottom is in the top 80% of the screen
    return (
        (rect.top >= 0 && rect.top <= windowHeight * 0.8) ||
        (rect.bottom >= windowHeight * 0.2 && rect.bottom <= windowHeight)
    );
}

function initPhysics() {
    const Engine = Matter.Engine,
        Render = Matter.Render,
        World = Matter.World,
        Bodies = Matter.Bodies,
        Mouse = Matter.Mouse,
        MouseConstraint = Matter.MouseConstraint,
        Constraint = Matter.Constraint,
        Body = Matter.Body,
        Events = Matter.Events;

    const container = document.getElementById('physics-container');
    const containerRect = container.getBoundingClientRect();

    // Create engine with zero gravity to keep balls afloat
    const engine = Engine.create({
        gravity: { x: 0, y: 0 }
    });

    // Create renderer
    const render = Render.create({
        element: container,
        engine: engine,
        options: {
            width: containerRect.width,
            height: containerRect.height,
            wireframes: false,
            background: 'transparent'
        }
    });

    // Create center anchor point (invisible)
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    const centerPoint = Bodies.circle(centerX, centerY, 5, {
        isStatic: true,
        render: { visible: false }
    });

    // Different sizes for each circle
    const radii = [200, 160, 240]; // Keep original sizes
    
    // Calculate positions in an equilateral triangle around center
    // Position the first circle (ranked) at the top
    const triangleRadius = 150; // Distance from center to vertex
    const angleStep = (Math.PI * 2) / 3;
    const positions = [
        { 
            x: centerX + Math.cos(0) * triangleRadius, 
            y: centerY + Math.sin(0) * triangleRadius - 40 // Move top circle higher
        },
        { 
            x: centerX + Math.cos(angleStep) * triangleRadius, 
            y: centerY + Math.sin(angleStep) * triangleRadius
        },
        { 
            x: centerX + Math.cos(angleStep * 2) * triangleRadius, 
            y: centerY + Math.sin(angleStep * 2) * triangleRadius
        }
    ];

    const circles = document.querySelectorAll('.circle-item');
    const bodies = [];

    // IMPORTANT: Swap positions to put ranked circle on top
    // The order in HTML is: [ranked, count, actors]
    // We want:             [ranked(top), actors(bottom left), count(bottom right)]
    const circleOrder = [circles[1], circles[2], circles[0]]; // Reorder circles

    positions.forEach((pos, i) => {
        const radius = radii[i];
        const body = Bodies.circle(
            pos.x,
            pos.y,
            radius,
            {
                restitution: 0.5,
                friction: 0.1,
                density: 0.01,
                frictionAir: 0.05,
                element: circleOrder[i] // Use reordered circles
            }
        );
        
        body.element = circleOrder[i];
        body.circleRadius = radius;
        body.originalPosition = { x: pos.x, y: pos.y };
        
        bodies.push(body);
    });

    // Create constraints to center anchor to keep triangle centered
    const centerConstraints = bodies.map(body => 
        Constraint.create({
            bodyA: body,
            pointB: { x: body.originalPosition.x, y: body.originalPosition.y },
            stiffness: 0.001,
            damping: 0.5,
            render: { visible: false }
        })
    );
    
    // Create triangle constraints between circles - NO GAP BETWEEN CIRCLES
    const triangleConstraints = [
        Constraint.create({
            bodyA: bodies[0],
            bodyB: bodies[1],
            length: bodies[0].circleRadius + bodies[1].circleRadius, // No extra gap
            stiffness: 0.005,
            damping: 0.2,
            render: { visible: false }
        }),
        Constraint.create({
            bodyA: bodies[1],
            bodyB: bodies[2],
            length: bodies[1].circleRadius + bodies[2].circleRadius, // No extra gap
            stiffness: 0.005,
            damping: 0.2,
            render: { visible: false }
        }),
        Constraint.create({
            bodyA: bodies[2],
            bodyB: bodies[0],
            length: bodies[2].circleRadius + bodies[0].circleRadius, // No extra gap
            stiffness: 0.005,
            damping: 0.2,
            render: { visible: false }
        })
    ];

    // Add all elements to world
    World.add(engine.world, [centerPoint, ...bodies, ...centerConstraints, ...triangleConstraints]);

    // Run the engine
    Engine.run(engine);
    Render.run(render);

    // Make the canvas pointer events none so DOM events work
    render.canvas.style.pointerEvents = 'none';

    // Add hover and drag behavior
    circleOrder.forEach((circle, i) => {
        const body = bodies[i];
        circle.style.transformOrigin = 'center center';
        
        // Add custom hover effect
        circle.addEventListener('mouseenter', () => {
            circle.style.transform = `translate(var(--x), var(--y)) scale(1.05)`;
        });
        
        circle.addEventListener('mouseleave', () => {
            circle.style.transform = `translate(var(--x), var(--y))`;
        });
        
        // Add drag with limited movement
        circle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            
            const startX = e.clientX;
            const startY = e.clientY;
            const startPosX = body.position.x;
            const startPosY = body.position.y;
            const maxDragDistance = 100; // Maximum drag distance in pixels
            
            const moveHandler = (moveEvent) => {
                // Calculate desired movement
                let deltaX = moveEvent.clientX - startX;
                let deltaY = moveEvent.clientY - startY;
                
                // Limit distance of drag from original position
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                if (distance > maxDragDistance) {
                    const ratio = maxDragDistance / distance;
                    deltaX *= ratio;
                    deltaY *= ratio;
                }
                
                Body.setPosition(body, {
                    x: startPosX + deltaX,
                    y: startPosY + deltaY
                });
            };
            
            const upHandler = () => {
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
            };
            
            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        });
    });

    // Sync DOM elements with physics world positions
    function updateCircles() {
        bodies.forEach((body, i) => {
            const element = body.element;
            const radius = body.circleRadius;
            const x = body.position.x - radius;
            const y = body.position.y - radius;
            element.style.setProperty('--x', `${x}px`);
            element.style.setProperty('--y', `${y}px`);
            element.style.width = `${radius * 2}px`;
            element.style.height = `${radius * 2}px`;
            element.style.transform = `translate(${x}px, ${y}px)`;
        });
        requestAnimationFrame(updateCircles);
    }
    updateCircles();
}

function initCharts() {
    // Chart configurations
    const chartConfigs = {
        genreChart: {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Average Box Office (Millions $)',
                    data: [],
                    backgroundColor: '#00FF7F',
                    borderColor: '#00FF7F',
                    borderWidth: 1
                }]
            },
            options: {
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#fff', font: { size: 14 } }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#fff', font: { size: 14 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#fff', font: { size: 14 } }
                    }
                }
            }
        },
        decadeChart: {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Number of Hits (Box Office > 2x Budget)',
                    data: [],
                    borderColor: '#00FF7F',
                    backgroundColor: 'rgba(0, 255, 127, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#00FF7F'
                }]
            },
            options: {
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#fff', font: { size: 14 } }
                    }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#fff', font: { size: 14 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#fff', font: { size: 14 } }
                    }
                }
            }
        },
        actorChart: {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Total Box Office (Billions $)',
                    data: [],
                    backgroundColor: '#00FF7F',
                    borderColor: '#00FF7F',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#fff', font: { size: 14 } }
                    }
                },
                scales: {
                    y: {
                        grid: { display: false },
                        ticks: { color: '#fff', font: { size: 14 } }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#fff', font: { size: 14 } }
                    }
                }
            }
        },
        budgetBoxOfficeChart: {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Box Office < Budget',
                        data: [],
                        backgroundColor: '#FF0000', // Red
                        pointRadius: 5
                    },
                    {
                        label: 'Budget ≤ Box Office < 2x Budget',
                        data: [],
                        backgroundColor: '#FFA500', // Orange
                        pointRadius: 5
                    },
                    {
                        label: 'Box Office ≥ 2x Budget',
                        data: [],
                        backgroundColor: '#008000', // Green
                        pointRadius: 5
                    }
                ]
            },
            options: {
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#fff', font: { size: 14 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += `Budget: $${context.raw.x.toFixed(2)}M, Box Office: $${context.raw.y.toFixed(2)}M`;
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'Production Budget ($M)',
                            color: '#fff',
                            font: { size: 14 }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#fff', font: { size: 14 } },
                        min: 1
                    },
                    y: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'Box Office ($M)',
                            color: '#fff',
                            font: { size: 14 }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#fff', font: { size: 14 } },
                        min: 1
                    }
                }
            }
        },
        imdbMetascoreChart: {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Box Office < Budget',
                        data: [],
                        backgroundColor: '#FF0000', // Red
                        pointRadius: 5
                    },
                    {
                        label: 'Budget ≤ Box Office < 2x Budget',
                        data: [],
                        backgroundColor: '#FFA500', // Orange
                        pointRadius: 5
                    },
                    {
                        label: 'Box Office ≥ 2x Budget',
                        data: [],
                        backgroundColor: '#008000', // Green
                        pointRadius: 5
                    }
                ]
            },
            options: {
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#fff', font: { size: 14 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += `IMDb: ${context.raw.x.toFixed(1)}, Metascore: ${context.raw.y}`;
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'IMDb Score',
                            color: '#fff',
                            font: { size: 14 }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#fff', font: { size: 14 } },
                        min: 0,
                        max: 10
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Metascore',
                            color: '#fff',
                            font: { size: 14 }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#fff', font: { size: 14 } },
                        min: 0,
                        max: 100
                    }
                }
            }
        }
    };

    // Function to fetch data and initialize a chart
    const initializeChart = (chartId, apiEndpoint) => {
        fetch(apiEndpoint)
            .then(response => response.json())
            .then(data => {
                const config = chartConfigs[chartId];
                if (chartId === 'budgetBoxOfficeChart' || chartId === 'imdbMetascoreChart') {
                    // For scatter plots, data is an array of datasets
                    config.data.datasets.forEach((dataset, index) => {
                        dataset.data = data[index].data;
                    });
                } else {
                    // For bar and line charts
                    config.data.labels = data.labels;
                    config.data.datasets[0].data = data.data;
                }
                const canvas = document.getElementById(chartId);
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    new Chart(ctx, config);
                }
            })
            .catch(error => console.error(`Error fetching data for ${chartId}:`, error));
    };

    // Initialize charts when they become visible
    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const chartId = entry.target.id;
                let apiEndpoint;
                switch (chartId) {
                    case 'genreChart':
                        apiEndpoint = '/api/genres';
                        break;
                    case 'decadeChart':
                        apiEndpoint = '/api/decade_hits';
                        break;
                    case 'actorChart':
                        apiEndpoint = '/api/actors';
                        break;
                    case 'budgetBoxOfficeChart':
                        apiEndpoint = '/api/budget_box_office';
                        break;
                    case 'imdbMetascoreChart':
                        apiEndpoint = '/api/imdb_metascore';
                        break;
                    default:
                        return;
                }
                initializeChart(chartId, apiEndpoint);
                observer.unobserve(entry.target);
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, {
        threshold: 0.1
    });

    // Observe each chart canvas
    Object.keys(chartConfigs).forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas) {
            observer.observe(canvas);
        }
    });
}

fetch("/api/stacked_avg_ratings")
    .then(response => response.json())
    .then(data => {
        Plotly.newPlot("stackedRatingChart", data.data, data.layout, {responsive: true});
    });


