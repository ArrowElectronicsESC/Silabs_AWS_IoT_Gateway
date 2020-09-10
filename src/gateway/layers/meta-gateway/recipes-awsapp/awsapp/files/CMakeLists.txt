#CMakeLists.txt for the AWS SDK for C++
cmake_minimum_required(VERSION 3.5)
project(awscpp)

set(APP_NAME awsapp)

set(CMAKE_CXX_STANDARD 11)

set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} ${CMAKE_CURRENT_SOURCE_DIR}/cmake)


configure_file(CMakeLists-rapidjson.txt.in ${CMAKE_BINARY_DIR}/${DEPENDENCY_DIR}/rapidjson/download/CMakeLists.txt)
execute_process(COMMAND ${CMAKE_COMMAND} -G "${CMAKE_GENERATOR}" .
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}/${DEPENDENCY_DIR}/rapidjson/download)
execute_process(COMMAND ${CMAKE_COMMAND} --build .
   WORKING_DIRECTORY ${CMAKE_BINARY_DIR}/${DEPENDENCY_DIR}/rapidjson/download)


# Add Target
add_executable(${APP_NAME} "${PROJECT_SOURCE_DIR}/src/main.cpp;${PROJECT_SOURCE_DIR}/src/aws-iot-core-class.cpp;${PROJECT_SOURCE_DIR}/src/aws-iot-device-class.cpp;${PROJECT_SOURCE_DIR}/src/common/ConfigCommon.cpp")

message("PROJECT_SOURCE_DIRECOTORY: ${PROJECT_SOURCE_DIR}")
target_include_directories(${APP_NAME} PUBLIC ${PROJECT_SOURCE_DIR}/include)
target_include_directories(${APP_NAME} PUBLIC ${PROJECT_SOURCE_DIR}/src)
target_include_directories(${APP_NAME} PUBLIC ${RAPIDJSON_INCLUDE_DIR})

target_include_directories(${APP_NAME} PUBLIC ${CMAKE_BINARY_DIR}/${DEPENDENCY_DIR}/rapidjson/src/include)

# Configure Threading library
find_package(Threads REQUIRED)

target_link_libraries(${APP_NAME} aws-iot-sdk-cpp mosquitto curl)
target_link_libraries(${APP_NAME} "Threads::Threads")

set(NETWORK_WRAPPER_DEST_TARGET ${APP_NAME})
include(${PROJECT_SOURCE_DIR}/src/network/CMakeLists.txt.in)

install(TARGETS ${APP_NAME} RUNTIME DESTINATION bin)
