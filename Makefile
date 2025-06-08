.PHONY: install test build dev clean lint help

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(GREEN)Synesthesia: AI-Powered LED Notification System$(NC)"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'

install: ## Install dependencies for all packages
	@echo "$(GREEN)Installing dependencies...$(NC)"
	@cd animation_encoder && cargo build
	@cd notification_service && npm install
	@echo "$(GREEN)✅ All dependencies installed$(NC)"

test: ## Run tests for all packages
	@echo "$(GREEN)Running tests...$(NC)"
	@echo "$(YELLOW)Testing Rust encoder...$(NC)"
	@cd animation_encoder && cargo test
	@echo "$(YELLOW)Testing notification service...$(NC)"
	@cd notification_service && npm test
	@echo "$(GREEN)✅ All tests passed$(NC)"

test-rust: ## Test only the Rust animation encoder
	@echo "$(GREEN)Testing Rust encoder...$(NC)"
	@cd animation_encoder && cargo test

test-service: ## Test only the notification service
	@echo "$(GREEN)Testing notification service...$(NC)"
	@cd notification_service && npm test

test-firmware: ## Test ESP32 firmware (requires hardware)
	@echo "$(GREEN)Testing ESP32 firmware...$(NC)"
	@cd esp32_firmware && pio test

build: ## Build all packages for production
	@echo "$(GREEN)Building packages...$(NC)"
	@echo "$(YELLOW)Building Rust encoder...$(NC)"
	@cd animation_encoder && cargo build --release
	@echo "$(YELLOW)Building notification service...$(NC)"
	@cd notification_service && npm run build
	@echo "$(YELLOW)Building ESP32 firmware...$(NC)"
	@cd esp32_firmware && pio run
	@echo "$(GREEN)✅ All packages built$(NC)"

build-rust: ## Build only the Rust animation encoder
	@echo "$(GREEN)Building Rust encoder...$(NC)"
	@cd animation_encoder && cargo build --release

build-service: ## Build only the notification service
	@echo "$(GREEN)Building notification service...$(NC)"
	@cd notification_service && npm run build

build-firmware: ## Build only the ESP32 firmware
	@echo "$(GREEN)Building ESP32 firmware...$(NC)"
	@cd esp32_firmware && pio run

upload-firmware: ## Upload firmware to ESP32 device
	@echo "$(GREEN)Uploading firmware to ESP32...$(NC)"
	@cd esp32_firmware && pio run --target upload

dev: ## Start development environment
	@echo "$(GREEN)Starting development environment...$(NC)"
	@cd notification_service && npm run dev

dev-mcp: ## Start development environment with MCP integration
	@echo "$(GREEN)Starting development environment with MCP...$(NC)"
	@cd notification_service && npm run dev -- --mcp

clean: ## Clean all build artifacts
	@echo "$(GREEN)Cleaning build artifacts...$(NC)"
	@cd animation_encoder && cargo clean
	@cd notification_service && npm run clean 2>/dev/null || true
	@cd esp32_firmware && pio run --target clean
	@echo "$(GREEN)✅ All artifacts cleaned$(NC)"

lint: ## Run linting for all packages
	@echo "$(GREEN)Running linters...$(NC)"
	@echo "$(YELLOW)Linting Rust code...$(NC)"
	@cd animation_encoder && cargo clippy -- -D warnings
	@echo "$(YELLOW)Linting TypeScript code...$(NC)"
	@cd notification_service && npm run lint
	@echo "$(GREEN)✅ All linting passed$(NC)"

format: ## Format code in all packages
	@echo "$(GREEN)Formatting code...$(NC)"
	@cd animation_encoder && cargo fmt
	@cd notification_service && npm run format 2>/dev/null || true
	@echo "$(GREEN)✅ Code formatted$(NC)"

docs: ## Generate documentation for all packages
	@echo "$(GREEN)Generating documentation...$(NC)"
	@cd animation_encoder && cargo doc --open
	@echo "$(GREEN)✅ Documentation generated$(NC)"

monitor: ## Monitor ESP32 serial output
	@echo "$(GREEN)Monitoring ESP32 serial output...$(NC)"
	@cd esp32_firmware && pio monitor

# Development workflow commands
check: test lint ## Run tests and linting (pre-commit check)

setup: install build ## Initial setup: install deps and build everything

release: clean build test lint ## Full release build with validation

# Service management
start-service: ## Start the notification service
	@echo "$(GREEN)Starting notification service...$(NC)"
	@cd notification_service && npm start

start-mcp: ## Start the service with MCP integration
	@echo "$(GREEN)Starting notification service with MCP...$(NC)"
	@cd notification_service && npm start -- --mcp

# Package-specific commands
encoder-test: ## Test animation encoder with sample data
	@echo "$(GREEN)Testing encoder with sample data...$(NC)"
	@cd animation_encoder && cargo test --test integration_tests -- --nocapture

service-coverage: ## Run notification service tests with coverage
	@echo "$(GREEN)Running service tests with coverage...$(NC)"
	@cd notification_service && npm test -- --coverage

# System info
versions: ## Show versions of all tools
	@echo "$(GREEN)System Versions:$(NC)"
	@echo "Node.js: $(shell node --version 2>/dev/null || echo 'Not installed')"
	@echo "npm: $(shell npm --version 2>/dev/null || echo 'Not installed')"
	@echo "Rust: $(shell rustc --version 2>/dev/null || echo 'Not installed')"
	@echo "Cargo: $(shell cargo --version 2>/dev/null || echo 'Not installed')"
	@echo "PlatformIO: $(shell pio --version 2>/dev/null || echo 'Not installed')"

status: ## Show status of all packages
	@echo "$(GREEN)Package Status:$(NC)"
	@echo "Animation Encoder: $(shell [ -f animation_encoder/Cargo.toml ] && echo '✅ Present' || echo '❌ Missing')"
	@echo "ESP32 Firmware: $(shell [ -f esp32_firmware/platformio.ini ] && echo '✅ Present' || echo '❌ Missing')"
	@echo "Notification Service: $(shell [ -f notification_service/package.json ] && echo '✅ Present' || echo '❌ Missing')"
	@echo ""
	@echo "$(GREEN)Build Artifacts:$(NC)"
	@echo "Rust Binary: $(shell [ -f animation_encoder/target/release/libanimation_encoder.* ] && echo '✅ Built' || echo '❌ Not built')"
	@echo "Service Build: $(shell [ -d notification_service/dist ] && echo '✅ Built' || echo '❌ Not built')"
	@echo "ESP32 Binary: $(shell [ -f esp32_firmware/.pio/build/*/firmware.bin ] && echo '✅ Built' || echo '❌ Not built')"