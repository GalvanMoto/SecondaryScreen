// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SecondaryScreenHost",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "secondary-host", targets: ["SecondaryScreenHost"])
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "SecondaryScreenHost",
            path: "Sources"
        )
    ]
)
