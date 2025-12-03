// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ISSOKiosk",
    platforms: [
        .iOS(.v16)
    ],
    dependencies: [
        // Square Mobile Payments SDK would be added here
        // Add via Xcode: File > Add Packages > https://github.com/square/square-mobile-payments-sdk-ios
    ],
    targets: [
        .target(
            name: "ISSOKiosk",
            dependencies: []
        )
    ]
)

